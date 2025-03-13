const mongoose = require("mongoose");
require("dotenv").config();

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("✅ Kết nối MongoDB thành công!");
        fetchSongsAndSaveArtists();
    })
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

// Định nghĩa Schema
const SongSchema = new mongoose.Schema({
    title: String,
    artist: String,
    album: String,
    duration: Number
});

const ArtistSchema = new mongoose.Schema({
    name: String,
    bio: { type: String, default: null },
    genre: { type: String, default: null }
});

const Song = mongoose.model("Song", SongSchema);
const Artist = mongoose.model("Artist", ArtistSchema);

// Hàm lấy danh sách bài hát & lưu nghệ sĩ
async function fetchSongsAndSaveArtists() {
    try {
        console.log("📌 Đang lấy danh sách bài hát từ MongoDB...");
        const songs = await Song.find();
        console.log(`📌 Tìm thấy ${songs.length} bài hát trong DB`);

        if (songs.length === 0) {
            console.log("⚠️ Không có bài hát nào trong database.");
            mongoose.connection.close();
            return;
        }

        // Danh sách nghệ sĩ không trùng lặp
        let artists = new Set();

        for (const song of songs) {
            artists.add(song.artist);
        }

        console.log("✅ Danh sách nghệ sĩ:", [...artists]);

        // Lưu nghệ sĩ vào database (nếu chưa có)
        for (const artistName of artists) {
            const existingArtist = await Artist.findOne({ name: artistName });

            if (!existingArtist) {
                const newArtist = new Artist({ name: artistName, bio: null, genre: null });
                await newArtist.save();
                console.log(`✅ Lưu nghệ sĩ mới: ${artistName}`);
            } else {
                console.log(`🔹 Nghệ sĩ ${artistName} đã tồn tại`);
            }
        }

        console.log("🎵 Hoàn tất lưu nghệ sĩ vào database!");
        mongoose.connection.close();
    } catch (error) {
        console.error("❌ Lỗi khi lấy/lưu dữ liệu:", error);
        mongoose.connection.close();
    }
}
