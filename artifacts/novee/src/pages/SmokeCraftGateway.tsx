import { useEffect } from "react";

export default function SmokeCraftGateway() {
  useEffect(() => {
    window.location.replace("/craft-hub?skip_splash=1");
  }, []);

  return (
    <div style={{
      position:       "fixed",
      inset:          0,
      background:     "#000",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
    }}>
      <div style={{
        width:        32,
        height:       32,
        border:       "2px solid rgba(212,175,55,0.2)",
        borderTop:    "2px solid #d4af37",
        borderRadius: "50%",
        animation:    "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
