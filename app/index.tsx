import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { getStoredWorker } from "../services/api";

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    getStoredWorker().then((worker) => {
      setTarget(worker ? "/home" : "/login");
    });
  }, []);

  if (!target) return null;
  return <Redirect href={target as any} />;
}
