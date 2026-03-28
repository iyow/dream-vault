export default function VideoPlayer({ src }) {
  if (!src) return null;
  return (
    <video
      controls
      className="w-full rounded-lg border border-slate-700"
      src={src}
    >
      您的浏览器不支持视频播放
    </video>
  );
}