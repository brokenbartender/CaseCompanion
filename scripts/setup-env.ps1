param(
  [string]$GeminiApiKey,
  [switch]$ForceKeys
)

$root = Split-Path -Parent $PSScriptRoot
$envExample = Join-Path $root "server\.env.example"
$envPath = Join-Path $root "server\.env"

function New-RandomSecret([int]$bytes = 32) {
  $buffer = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  [Convert]::ToBase64String($buffer)
}

# 1. Ensure .env exists
if (-not (Test-Path $envPath)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envPath
  } else {
    New-Item -ItemType File -Path $envPath | Out-Null
  }
}

$script:content = Get-Content $envPath -Raw
if (-not $script:content) {
  $script:content = ""
}

# Merge defaults from .env.example when missing
if (Test-Path $envExample) {
  $exampleLines = Get-Content $envExample
  foreach ($line in $exampleLines) {
    if ($line -match "^[A-Z0-9_]+=") {
      $key = ($line -split "=", 2)[0]
      $escaped = [regex]::Escape($key)
      if (-not ($script:content -match "(?m)^$escaped=")) {
        if ($script:content.Length -gt 0 -and -not $script:content.EndsWith("`n")) {
          $script:content += "`n"
        }
        $script:content += $line
      }
    }
  }
}

# 2. Handle Gemini API Key
if (-not $GeminiApiKey) {
  $GeminiApiKey = $env:GEMINI_API_KEY
}
if (-not $GeminiApiKey) {
  # Check if it's already set in the file to avoid re-prompting
  if ($script:content -match "(?m)^GEMINI_API_KEY=(.+)$") {
     $GeminiApiKey = $matches[1]
  }
}
if (-not $GeminiApiKey) {
  $secure = Read-Host "Enter GEMINI_API_KEY (required for AI)" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $GeminiApiKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}
if (-not $GeminiApiKey) {
  Write-Error "GEMINI_API_KEY is required to enable AI."
  exit 1
}

# 3. Define Helper to update/append env vars
function Ensure-EnvValue([string]$key, [string]$value) {
  $escaped = [regex]::Escape($key)
  if ($script:content -match "(?m)^$escaped=.*$") {
    # If key exists (empty or not), update it if we have a value.
    # Logic: Only overwrite if it looks empty or we are forcing a setup,
    # but for secrets we generally generate once.
    # For this script, we'll replace if the line is just "KEY="
    if ($script:content -match "(?m)^$escaped=$") {
      $script:content = [regex]::Replace(
        $script:content,
        "(?m)^$escaped=.*$",
        { param($m) "$key=$value" }
      )
    }
  } else {
    # Key missing entirely, append it
    if ($script:content.Length -gt 0 -and -not $script:content.EndsWith("`n")) {
      $script:content += "`n"
    }
    $script:content += "$key=$value"
  }
}

function Remove-EnvBlock([string]$key) {
  $escaped = [regex]::Escape($key)
  $lines = $script:content -split "`n"
  $newLines = New-Object System.Collections.Generic.List[string]
  $skip = $false
  foreach ($line in $lines) {
    if ($line -match "(?m)^$escaped=") {
      $skip = $true
      continue
    }
    if ($skip -and $line -match "^[A-Z0-9_]+=") {
      $skip = $false
    }
    if (-not $skip) {
      $newLines.Add($line)
    }
  }
  $script:content = ($newLines -join "`n").TrimEnd()
}

# 4. Generate Signing Keys (The Fix)
# We use Node.js to generate the keys because it ensures compatibility with the app's crypto module.
$hasPrivateKey = $script:content -match "PRIVATE_KEY_PEM=[\\w-]"
$hasMultilineKey = $script:content -match "(?m)^PRIVATE_KEY_PEM=-----BEGIN[\\s\\S]*?-----END PRIVATE KEY-----"
$shouldGenerateKeys = $ForceKeys -or (-not $hasPrivateKey) -or $hasMultilineKey
if ($shouldGenerateKeys) {
    Write-Host "Generating Release Certificate Signing Keys (EC P-256)..." -ForegroundColor Cyan

    # Node script to generate keys and output them as single-line escaped strings
    $nodeScript = @"
const { generateKeyPairSync } = require('crypto');
const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
// Wrap output to avoid console noise corrupting parsing
console.log('<<<KEY_START>>>');
console.log(privateKey.replace(/\r?\n/g, '\\n'));
console.log('<<<SPLIT>>>');
console.log(publicKey.replace(/\r?\n/g, '\\n'));
console.log('<<<KEY_END>>>');
"@

    try {
        $rawOutput = node -e $nodeScript 2>&1 | Out-String
        if ($rawOutput -match "<<<KEY_START>>>\s*(.*)\s*<<<SPLIT>>>\s*(.*)\s*<<<KEY_END>>>") {
            $priv = $matches[1].Trim()
            $pub = $matches[2].Trim()

            Remove-EnvBlock "PRIVATE_KEY_PEM"
            Remove-EnvBlock "PUBLIC_KEY_PEM"
            Ensure-EnvValue "PRIVATE_KEY_PEM" $priv
            Ensure-EnvValue "PUBLIC_KEY_PEM" $pub
            Write-Host "Keys generated and injected." -ForegroundColor Green
        } else {
            Write-Warning "Failed to parse Node.js output. Check if Node is installed/working."
        }
    } catch {
        Write-Warning "Node.js execution failed. Ensure Node is in your PATH."
    }
}

# 5. Populate Standard Secrets
Ensure-EnvValue "JWT_SECRET" (New-RandomSecret)
Ensure-EnvValue "MFA_SECRET" (New-RandomSecret)
Ensure-EnvValue "INTERNAL_AUDIT_TOKEN" (New-RandomSecret)
Ensure-EnvValue "GEMINI_API_KEY" $GeminiApiKey

# 6. Save
Set-Content -Path $envPath -Value $script:content -NoNewline
Write-Host "Configuration written to $envPath" -ForegroundColor Green
