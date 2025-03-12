const ytdl = require("ytdl-core");
const fs = require("fs");
const playlistInfo = require("youtube-playlist-info");

const API_KEY = "AIzaSyAp-IQcR9JSq3BvfBvyR0diyDPMDIb8Qsk"; // Thay bằng API Key YouTube của bạn
const PLAYLIST_ID = "OLAK5uy_k-hR9_szGQjLlUJNIGj14ukZ9vkPl0QKM"; // Thay bằng ID playlist

async function downloadAudio(url, title) {
    const dir = "downloads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); // Tạo thư mục nếu chưa có
  
    const filePath = `${dir}/${title.replace(/[<>:"/\\|?*]+/g, "")}.mp3`; // Xóa ký tự đặc biệt tránh lỗi
    const stream = ytdl(url, { filter: "audioonly" });
  
    stream.pipe(fs.createWriteStream(filePath));
    stream.on("finish", () => console.log(`✅ Đã tải: ${title}`));
  }
  

async function downloadPlaylist() {
  console.log("🔍 Đang lấy danh sách bài hát...");
  const videos = await playlistInfo(API_KEY, PLAYLIST_ID);
  
  if (!fs.existsSync("downloads")) fs.mkdirSync("downloads");

  for (const video of videos) {
    console.log(`🎵 Đang tải: ${video.title}`);
    await downloadAudio(video.resourceId.videoId, video.title);
  }
}

downloadPlaylist().catch(console.error);
