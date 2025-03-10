const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
// Kết nối MongoDB
const app = express();
const PORT = process.env.PORT || 3000;
mongoose.connect(mongoURI)
  .then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));
app.use(cors());
app.use(express.json());

  
// Định nghĩa schema album
const AlbumSchema = new mongoose.Schema({
    album: String,
    artist: String,
    song_count: Number,
    cover: String
});

const Album = mongoose.model("Album", AlbumSchema);

// Thư mục gốc chứa tất cả nghệ sĩ
const MUSIC_DIR = "H:/cai dat/web nhac/nhac/";

async function scanAlbums() {
    const artists = fs.readdirSync(MUSIC_DIR).filter(artist => fs.statSync(path.join(MUSIC_DIR, artist)).isDirectory());

    for (const artistName of artists) {
        const artistPath = path.join(MUSIC_DIR, artistName);
        const albums = fs.readdirSync(artistPath).filter(album => fs.statSync(path.join(artistPath, album)).isDirectory());

        for (const albumName of albums) {
            const albumPath = path.join(artistPath, albumName);
            const files = fs.readdirSync(albumPath);

            // Tìm ảnh bìa (ưu tiên cover.jpg hoặc cover.png)
            const coverImage = files.find(file => file.startsWith("cover") && (file.endsWith(".jpg") || file.endsWith(".png"))) || "no-cover.jpg";
            const coverUrl = `/static/${artistName}/${albumName}/${coverImage}`; // Đường dẫn API hiển thị cover

            // Đếm số bài hát
            const songCount = files.filter(file => file.endsWith(".mp3") || file.endsWith(".wav")).length;

            if (songCount > 0) {
                const newAlbum = new Album({
                    album: albumName,
                    artist: artistName, // Lấy tên nghệ sĩ từ thư mục cha
                    song_count: songCount,
                    cover: coverUrl
                });

                await Album.findOneAndUpdate({ album: albumName, artist: artistName }, newAlbum, { upsert: true });
                console.log(`✅ Album: ${albumName} - Nghệ sĩ: ${artistName} (Bài hát: ${songCount}) đã được lưu.`);
            }
        }
    }
    console.log("🎵 Quét album hoàn tất!");
    mongoose.connection.close();
}

scanAlbums().catch(err => console.error("❌ Lỗi khi quét thư mục:", err));
