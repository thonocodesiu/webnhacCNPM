const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

app.use(cors());
app.use(express.json());

// Định nghĩa schema
const ArtistSchema = new mongoose.Schema({
    name: String,
    genre: { type: String, default: null },
    bio: { type: String, default: null },
    avatar: String,
    albums: [String]
});

const AlbumSchema = new mongoose.Schema({
    album: String,
    artist: String,
    song_count: Number,
    cover: String
});

const Artist = mongoose.model("Artist", ArtistSchema);
const Album = mongoose.model("Album", AlbumSchema);

// API GET /songs để lấy danh sách bài hát
app.get("/songs", async (req, res) => {
    try {
        const albums = await Album.find();
        res.json(albums);
    } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách bài hát:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
});

// Thư mục chứa nhạc
const MUSIC_DIR = "H:/cai dat/web nhac/nhac/";

async function scanAlbums() {
    const artists = fs.readdirSync(MUSIC_DIR).filter(artist => fs.statSync(path.join(MUSIC_DIR, artist)).isDirectory());

    for (const artistName of artists) {
        const artistPath = path.join(MUSIC_DIR, artistName);
        const albums = fs.readdirSync(artistPath).filter(album => fs.statSync(path.join(artistPath, album)).isDirectory());

        // Kiểm tra nghệ sĩ có trong DB chưa
        let artistRecord = await Artist.findOne({ name: artistName });
        if (!artistRecord) {
            artistRecord = new Artist({
                name: artistName,
                genre: null,
                bio: null,
                avatar: `/static/artists/${artistName}.jpg`,
                albums: []
            });
            await artistRecord.save();
            console.log(`✅ Nghệ sĩ mới: ${artistName} đã được lưu!`);
        }

        for (const albumName of albums) {
            const albumPath = path.join(artistPath, albumName);
            const files = fs.readdirSync(albumPath);

            // Tìm ảnh bìa album
            const coverImage = files.find(file => file.startsWith("cover") && (file.endsWith(".jpg") || file.endsWith(".png"))) || "no-cover.jpg";
            const coverUrl = `/static/${artistName}/${albumName}/${coverImage}`;

            // Đếm số bài hát
            const songCount = files.filter(file => file.endsWith(".mp3") || file.endsWith(".wav")).length;

            if (songCount > 0) {
                const newAlbum = new Album({
                    album: albumName,
                    artist: artistName,
                    song_count: songCount,
                    cover: coverUrl
                });

                await Album.findOneAndUpdate({ album: albumName, artist: artistName }, newAlbum, { upsert: true });
                console.log(`✅ Album: ${albumName} - Nghệ sĩ: ${artistName} (Bài hát: ${songCount}) đã được lưu.`);

                // Cập nhật danh sách album của nghệ sĩ
                if (!artistRecord.albums.includes(albumName)) {
                    artistRecord.albums.push(albumName);
                    await artistRecord.save();
                }
            }
        }
    }
    console.log("🎵 Quét album hoàn tất!");
    mongoose.connection.close();
}

scanAlbums().catch(err => console.error("❌ Lỗi khi quét thư mục:", err));
