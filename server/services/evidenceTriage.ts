type TriageIndicator = {
  code: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

type TriageResult = {
  status: "OK" | "REVIEW";
  indicators: TriageIndicator[];
  createdAt: string;
  version: string;
  privilegeCandidate: boolean;
  privilegeTag: "NONE" | "ATTORNEY_CLIENT" | "WORK_PRODUCT";
  privilegeType: "NONE" | "ACP" | "WPD";
  privilegeSignals: string[];
};

function bufferIncludes(buffer: Buffer, needle: string) {
  return buffer.includes(Buffer.from(needle, "utf8"));
}

function extractPdfMetadata(buffer: Buffer) {
  const text = buffer.toString("latin1");
  const creatorMatch = text.match(/\/Creator\s*\(([^)]+)\)/i);
  const producerMatch = text.match(/\/Producer\s*\(([^)]+)\)/i);
  return {
    creator: creatorMatch?.[1]?.trim() || null,
    producer: producerMatch?.[1]?.trim() || null
  };
}

function hasDateHint(value?: string | null) {
  if (!value) return false;
  return /\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/.test(value)
    || /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(20\d{2})\b/.test(value);
}

function detectPrivilegeSignals(input: { filename: string; buffer: Buffer }) {
  const signals: string[] = [];
  const filename = input.filename.toLowerCase();
  const sample = input.buffer.toString("utf8", 0, Math.min(input.buffer.length, 200_000)).toLowerCase();
  const haystack = `${filename}\n${sample}`;

  const has = (needle: string) => haystack.includes(needle);
  const add = (code: string) => signals.push(code);

  if (has("privileged") || has("privileged & confidential") || has("privileged and confidential")) add("privileged_marker");
  if (has("attorney-client") || has("attorney client") || has("legal advice")) add("attorney_client");
  if (has("work product") || has("prepared in anticipation") || has("litigation")) add("work_product");

  let privilegeTag: TriageResult["privilegeTag"] = "NONE";
  let privilegeType: TriageResult["privilegeType"] = "NONE";
  if (signals.includes("attorney_client") || signals.includes("privileged_marker")) {
    privilegeTag = "ATTORNEY_CLIENT";
    privilegeType = "ACP";
  } else if (signals.includes("work_product")) {
    privilegeTag = "WORK_PRODUCT";
    privilegeType = "WPD";
  }

  return {
    privilegeCandidate: privilegeTag !== "NONE",
    privilegeTag,
    privilegeType,
    privilegeSignals: signals
  };
}

export function triageEvidence(input: {
  filename: string;
  mimeType: string;
  fileBuffer: Buffer;
  custodianName?: string;
  custodianEmail?: string;
}): TriageResult {
  const indicators: TriageIndicator[] = [];
  const { filename, mimeType, fileBuffer, custodianName, custodianEmail } = input;
  const privilege = detectPrivilegeSignals({ filename, buffer: fileBuffer });

  if (!custodianName || !custodianEmail) {
    indicators.push({
      code: "custodian_missing",
      message: "Custodian fields were not provided at intake.",
      severity: "MEDIUM"
    });
  }

  if (mimeType === "application/pdf") {
    const meta = extractPdfMetadata(fileBuffer);
    if (!meta.creator && !meta.producer) {
      indicators.push({
        code: "pdf_metadata_missing",
        message: "PDF metadata is missing creator/producer fields.",
        severity: "LOW"
      });
    }
    const toolHint = `${meta.creator || ""} ${meta.producer || ""}`.toLowerCase();
    if (toolHint.includes("acrobat") || toolHint.includes("word") || toolHint.includes("preview")) {
      indicators.push({
        code: "pdf_edit_tools_detected",
        message: `PDF shows edit tool metadata: ${meta.creator || meta.producer}.`,
        severity: "MEDIUM"
      });
    }
  }

  if (mimeType.startsWith("image/")) {
    if (!bufferIncludes(fileBuffer, "Exif")) {
      indicators.push({
        code: "image_exif_missing",
        message: "Image is missing EXIF metadata.",
        severity: "LOW"
      });
    }
  }

  if (mimeType.startsWith("audio/")) {
    const hasAudioMeta = bufferIncludes(fileBuffer, "ID3")
      || bufferIncludes(fileBuffer, "RIFF")
      || bufferIncludes(fileBuffer, "OggS");
    if (!hasAudioMeta) {
      indicators.push({
        code: "audio_metadata_missing",
        message: "Audio file lacks detectable container metadata (duration may be unavailable).",
        severity: "LOW"
      });
    }
  }

  if (!hasDateHint(filename)) {
    indicators.push({
      code: "timestamp_missing",
      message: "Original timestamp could not be inferred from filename.",
      severity: "LOW"
    });
  }

  return {
    status: indicators.length || privilege.privilegeCandidate ? "REVIEW" : "OK",
    indicators: privilege.privilegeCandidate
      ? indicators.concat([{
        code: "privilege_candidate",
        message: "Potential privilege detected; review required.",
        severity: "HIGH"
      }])
      : indicators,
    createdAt: new Date().toISOString(),
    version: "v1",
    privilegeCandidate: privilege.privilegeCandidate,
    privilegeTag: privilege.privilegeTag,
    privilegeType: privilege.privilegeType,
    privilegeSignals: privilege.privilegeSignals
  };
}
