$Goal = "Update src/components/AgentDevPanel.tsx: under the input field add a helper line: 'Tip: prefix with builder: for code changes.' Use write_source_file. Then run npm run build and report."
& "$PSScriptRoot\\run-builder.ps1" -Goal $Goal
