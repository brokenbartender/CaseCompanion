import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getMatterId, setMatterId } from "../services/authStorage";

export function useMatterId() {
  const params = useParams();
  const paramMatterId = typeof params.matterId === "string" ? params.matterId : "";
  const storedMatterId = getMatterId();

  useEffect(() => {
    if (paramMatterId) {
      if (paramMatterId !== storedMatterId) {
        setMatterId(paramMatterId);
      }
    }
  }, [paramMatterId, storedMatterId]);

  return useMemo(() => {
    if (paramMatterId) return paramMatterId;
    return storedMatterId;
  }, [paramMatterId, storedMatterId]);
}
