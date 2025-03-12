const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const mm = require("music-metadata");
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
const musicFolder = "H:\\cai dat\\web nhac\\nhac\\The Weeknd";

const importSongs = async () => {
    const files = fs.readdirSync(musicFolder);
    const albumData = {}; // Lưu danh sách album

    for (const file of files) {
        if (path.extname(file) === ".mp3" || path.extname(file) === ".flac") {
            const filePath = path.join(musicFolder, file);
            const filename = file;
            let title = filename.replace(".flac", ""); // Mặc định lấy từ tên file
            let artist = "The Weeknd";
            let album = "Unknown Album";

            try {
                const metadata = await mm.parseFile(filePath);
                title = metadata.common.title || title;
                artist = metadata.common.artist || artist;
                album = metadata.common.album || album;
            } catch (error) {
                console.warn(`⚠️ Không thể đọc metadata của: ${filename}, dùng tên file.`);
            }

            // Lưu bài hát vào database nếu chưa tồn tại
            const existingSong = await Song.findOne({ filename });
            if (!existingSong) {
                await Song.create({ title, artist, album, filename });
                console.log(`✅ Đã thêm bài hát: ${title} - ${artist} (${album})`);
            } else {
                console.log(`⚠️ Bỏ qua (đã tồn tại): ${title}`);
            }

            // Cập nhật danh sách album
            if (!albumData[album]) {
                albumData[album] = { artist, songs: [] };
            }
            albumData[album].songs.push({ title, filename });
        }
    }

    // Lưu album vào MongoDB
    

    console.log("🎵 Hoàn thành nhập danh sách bài hát và album!");
    mongoose.connection.close();
};

// Chạy script
importSongs();
