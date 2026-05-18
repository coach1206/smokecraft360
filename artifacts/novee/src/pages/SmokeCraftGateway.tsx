export default function SmokeCraftGateway() {
  return (
    <iframe
      src="/master-blender?skip_splash=1"
      style={{
        position: "fixed",
        inset:    0,
        width:    "100%",
        height:   "100%",
        border:   "none",
        display:  "block",
      }}
      title="SmokeCraft 360"
      allow="autoplay"
    />
  );
}
