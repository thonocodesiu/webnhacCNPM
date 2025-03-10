const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Kết nối MongoDB
const app = express();
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

app.use(cors());
app.use(express.json());

// Định nghĩa schema bài hát
const songSchema = new mongoose.Schema({
    title: String,
    artist: String,
    album: String,
    filename: String
});
const Song = mongoose.model("Song", songSchema);

// Định nghĩa schema album
const albumSchema = new mongoose.Schema({
    album: String,
    artist: String,
    song_count: Number,
    cover: String,
    songs: [{ title: String, filename: String }]
});
const Album = mongoose.model("Album", albumSchema);

// Thư mục chứa nhạc
const musicFolder = "H:\\cai dat\\web nhac\\nhac\\The Weekend";

const importSongs = async () => {
    const files = fs.readdirSync(musicFolder);
    const albumData = {}; // Lưu danh sách album

    for (const file of files) {
        if (path.extname(file) === ".mp3") {
            const filename = file;
            const title = file.replace(/\d+\.\s*/, "").replace(".flac", "").split(" - ")[0];
            const artist = "The Weekend"; // Nghệ sĩ cố định, có thể cập nhật từ metadata nếu cần
            const album = "After Hours"; // Album cố định, có thể cập nhật từ metadata nếu cần
            const albumPath = path.join(musicFolder);

            // Tìm ảnh bìa (ưu tiên cover.jpg, nếu không có thì cover.png)
            const coverImage = fs.existsSync(path.join(albumPath, "cover.jpg")) 
                ? "cover.jpg" 
                : fs.existsSync(path.join(albumPath, "cover.png")) 
                ? "cover.png" 
                : "no-cover.jpg";

            const coverUrl = `/static/tlinh/${coverImage}`;

            // Kiểm tra bài hát đã tồn tại chưa
            const existingSong = await Song.findOne({ filename });
            if (!existingSong) {
                await Song.create({ title, artist, album, filename });
                console.log(`✅ Đã thêm bài hát: ${title}`);
            } else {
                console.log(`⚠️ Bỏ qua (đã tồn tại): ${title}`);
            }

            // Thêm bài hát vào danh sách album
            if (!albumData[album]) {
                albumData[album] = { album, artist, cover: coverUrl, songs: [] };
            }
            albumData[album].songs.push({ title, filename });
        }
    }

    // Lưu album vào MongoDB
    for (const albumName in albumData) {
        const album = albumData[albumName];
        album.song_count = album.songs.length; // Thêm số lượng bài hát

        await Album.findOneAndUpdate({ album: albumName }, album, { upsert: true });
        console.log(`✅ Đã thêm album: ${albumName} (${album.song_count} bài hát) - Cover: ${album.cover}`);
    }

    console.log("🎵 Hoàn thành nhập danh sách bài hát và album!");
    mongoose.connection.close();
};

// Chạy script
importSongs();
