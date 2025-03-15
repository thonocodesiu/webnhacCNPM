const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const session = require("express-session");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const send = require('send');
const app = express();
const PORT = process.env.PORT || 3000;
const MUSIC_ROOT = path.join("H:", "cai dat", "web nhac", "nhac");
const COVERS_PATH = path.join(MUSIC_ROOT, "covers");
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Kết nối MongoDB thành công"))
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 86400000, httpOnly: true, sameSite: 'lax' }
}));

const Song = mongoose.model("Song", new mongoose.Schema({
    title: String,
    artist: String,
    album: String,
    duration: String,
    filename: String
}));

const User = mongoose.model("User", new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" }
}));

let playlist = [];
let currentIndex = 0;
const authenticateToken = (req, res, next) => {
    // Kiểm tra header Authorization
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ message: "❌ Không có token!" });
    }

    // Kiểm tra định dạng "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ message: "❌ Định dạng token không hợp lệ!" });
    }

    const token = parts[1]; // Lấy token
    if (!token) {
        return res.status(401).json({ message: "❌ Token không tồn tại!" });
    }

    // Xác thực token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "❌ Token hết hạn hoặc không hợp lệ!" });
        }
        req.user = user;
        next(); // Chuyển sang middleware tiếp theo
    });
};

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: "✅ Đăng ký thành công" });
    } catch (err) {
        res.status(400).json({ message: "❌ Tên người dùng đã tồn tại." });
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: "❌ Sai tài khoản hoặc mật khẩu" });
    }
    const token = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, message: "✅ Đăng nhập thành công", saveTokenInstruction: "Save this token to localStorage" });
});

app.post("/logout", (req, res) => {
    res.json({ message: "✅ Đăng xuất thành công" });
});

app.get("/albums", async (req, res) => {
    try {
        const albums = await Song.distinct("album");
        res.json(albums);
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server." });
    }
});

app.get("/songs", async (req, res) => {
    const album = req.query.album;
    const query = album ? { album } : {}; // Nếu không có album, lấy tất cả bài hát
    const songs = await Song.find(query);
    res.json(songs);
});


// Add a new endpoint to fetch all songs belonging to an album
app.get("/all-songs", async (req, res) => {
    try {
        const songs = await Song.find();
        res.json(songs);
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server." });
    }
});

app.get("/play/:artist/:filename", (req, res) => {
    const { artist, filename } = req.params;
    const filePath = path.join(MUSIC_ROOT, artist, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "❌ Không tìm thấy bài hát" });
    }
    res.setHeader("Access-Control-Allow-Origin", "*"); // Cấp quyền truy cập từ ngrok
    res.setHeader("Content-Type", "audio/mpeg"); // Định dạng file nhạc
    res.sendFile(filePath);
});

app.get("/next", (req, res) => {
    if (playlist.length === 0) return res.status(400).json({ error: "Playlist trống" });
    currentIndex = (currentIndex + 1) % playlist.length;
    res.json(playlist[currentIndex]);
});

app.get("/prev", (req, res) => {
    if (playlist.length === 0) return res.status(400).json({ error: "Playlist trống" });
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    res.json(playlist[currentIndex]);
});

app.get("/cover/:album", (req, res) => {
    try {
        let album = req.params.album;
        album = decodeURIComponent(album);
        album = album.replace(/[%<>:"/\\|?*]+/g, "").trim();

        if (!fs.existsSync(COVERS_PATH)) {
            return res.status(500).json({ error: "Thư mục covers không tồn tại." });
        }

        const possibleCovers = [".jpg", ".png"].map(ext => path.join(COVERS_PATH, album + ext));
        let coverFile = "no-cover.jpg";

        for (const filePath of possibleCovers) {
            if (fs.existsSync(filePath)) {
                coverFile = path.basename(filePath);
                break;
            }
        }

        res.json({ coverUrl: `http://localhost:${PORT}/covers/${encodeURIComponent(coverFile)}` });
    } catch (error) {
        res.status(500).json({ error: "Lỗi server khi lấy ảnh cover." });
    }
});

app.get("/shuffle-playlist", async (req, res) => {
    try {
        playlist = await Song.find();
        playlist = playlist.sort(() => Math.random() - 0.5).slice(0, 10); // Limit to 10 songs
        currentIndex = 0;
        res.json(playlist);
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server." });
    }
});
const playlistSchema = new mongoose.Schema({
    username: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    songs: [
        {
            title: { type: String, required: true },
            filename: { type: String, required: true }
        }
    ]
});
const Playlist = mongoose.model("Playlist", playlistSchema);

app.post("/playlist", authenticateToken, async (req, res) => {
    const { name, description, songs = [] } = req.body;
    const username = req.user.username;

    if (!name) {
        return res.status(400).json({ message: "❌ Tên playlist là bắt buộc." });
    }

    const formattedSongs = Array.isArray(songs) && songs.length > 0
        ? songs.map(song => ({
            title: song.title || "Unknown Title",
            filename: song.filename || "Unknown Filename"
        }))
        : [];

    const playlist = new Playlist({ username, name, description, songs: formattedSongs });
    await playlist.save();

    res.status(201).json({ message: "✅ Playlist đã được tạo!", playlist });
});




app.get("/playlist", authenticateToken, async (req, res) => {
    const username = req.user.username;
    const playlists = await Playlist.find({ username }); // Lọc theo username
    res.json(playlists);
});

// History Routes
app.post("/history", authenticateToken, async (req, res) => {
    const { song_id } = req.body;
    const history = new History({ user_id: req.user._id, song_id });
    await history.save();
    res.status(201).json({ message: "✅ Đã thêm vào lịch sử nghe" });
});

app.get("/history", authenticateToken, async (req, res) => {
    const history = await History.find({ user_id: req.user._id }).populate("song_id").sort({ played_at: -1 });
    res.json(history);
});

// Favorites Routes
const favoriteSchema = new mongoose.Schema({
    username: { type: String, required: true },  // Lưu username thay vì ObjectId
    title: { type: String, required: true }  // Lưu title của bài hát thay vì songId
});
// Thêm vào server.js
app.delete("/favorite", authenticateToken, async (req, res) => {
    const { title } = req.body;
    await Favorite.deleteOne({ username: req.user.username, title });
    res.json({ message: "✅ Đã xóa khỏi yêu thích" });
});

const Favorite = mongoose.model("Favorite", favoriteSchema);

app.post("/favorite", authenticateToken, async (req, res) => {
    console.log("🔎 Token nhận được:", req.headers.authorization);
    console.log("📌 Dữ liệu nhận được từ frontend:", req.body);

    const { title } = req.body;
    const username = req.user.username;

    if (!title) {
        return res.status(400).json({ message: "❌ Thiếu tên bài hát!" });
    }

    const favorite = new Favorite({ username, title });
    await favorite.save();

    res.status(201).json({ message: "✅ Đã thêm vào danh sách yêu thích!" });
});
let isPlaying = false;
// Play endpoint
app.post('/api/play', (req, res) => {
    isPlaying = true;
    res.send({ message: 'Playback started', playing: isPlaying });
});
// Pause endpoint
app.post('/api/pause', (req, res) => {
    isPlaying = false;
    res.send({ message: 'Playback paused', playing: isPlaying });
});
// Status endpoint (optional)
app.get('/api/status', (req, res) => {
    res.send({ playing: isPlaying });
});
app.delete("/unfavorite", authenticateToken, async (req, res) => {
    const { title } = req.body;
    await Favorite.deleteOne({ username: req.user.username, title });
    res.json({ message: "✅ Đã xóa khỏi yêu thích" });
});
app.get("/favorite", authenticateToken, async (req, res) => {
    const username = req.user.username;  // Lấy username từ token
    const favorites = await Favorite.find({ username });

    res.json(favorites);
});
// ------------ TRONG FILE server.js ------------

// Lấy danh sách favorites theo username
app.get('/api/favorites/:username', async (req, res) => {
    try {
        const username = req.params.username;

        const favorites = await Favorite.find({ username })
            .select('title createdAt')
            .sort({ createdAt: -1 });

        if (!favorites.length) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mục yêu thích nào cho người dùng này'
            });
        }

        res.status(200).json({
            success: true,
            data: favorites
        });

    } catch (error) {
        console.error('Lỗi khi lấy danh sách yêu thích:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý yêu cầu'
        });
    }
});

// Lấy danh sách playlists theo username
app.get('/api/playlists/:username', async (req, res) => {
    try {
        const username = req.params.username;

        const playlists = await Playlist.find({ username })
            .select('name songs createdAt')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: playlists || [] // ✅ Trả về [] nếu user chưa có playlist
        });

    } catch (error) {
        console.error('Lỗi khi lấy danh sách playlist:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý yêu cầu'
        });
    }
});

// Lấy danh sách bài hát theo playlists theo username
app.get("/api/playlist/:username/:playlistName", authenticateToken, async (req, res) => {
    try {
        const { username, playlistName } = req.params;

        // Tìm playlist của user
        const playlist = await Playlist.findOne({ username, name: playlistName });
        if (!playlist) {
            return res.status(404).json({ message: "Playlist không tồn tại!" });
        }

        // Lấy thông tin chi tiết bài hát từ danh sách `songs`
        const songs = await Song.find({ title: { $in: playlist.songs } });

        res.json({
            playlistName: playlist.name,
            songs: songs.map(song => ({
                title: song.title,
                artist: song.artist,
                album: song.album,
                duration: song.duration,
                url: `/play/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.filename)}`
            }))
        });

    } catch (error) {
        console.error("Lỗi khi lấy danh sách bài hát:", error);
        res.status(500).json({ message: "Lỗi server." });
    }
});
// Thêm bài hát vào playlist tồn tại
async function loadUserPlaylist(playlistId) {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("⚠️ Bạn chưa đăng nhập! Vui lòng đăng nhập để xem playlist.");
            window.location.href = "login.html"; // Điều hướng về trang đăng nhập
            return;
        }

        const response = await fetch(`${API_URL}/playlist/${playlistId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Không thể tải playlist!");
        }

        const playlistData = await response.json();

        document.getElementById("playlistTitle").textContent = playlistData.name;
        document.getElementById("songCount").textContent = `${playlistData.songs.length} bài hát`;
        songs = playlistData.songs;
    } catch (error) {
        console.error("Lỗi khi tải playlist:", error);
    }
}

app.put("/playlist/:id", authenticateToken, async (req, res) => {
    try {
        console.log("📥 Dữ liệu nhận từ client:", req.body);

        let { songTitle, artist, filename } = req.body;
        
        if (!songTitle || !filename) {
            return res.status(400).json({ message: "⚠️ Thiếu songTitle hoặc filename!" });
        }

        filename = decodeURIComponent(filename).trim(); // Giải mã URL filename

        const playlist = await Playlist.findById(req.params.id);
        if (!playlist) {
            return res.status(404).json({ message: "Playlist không tồn tại" });
        }

        const songExists = playlist.songs.some(song => 
            song.title === songTitle && song.filename === filename
        );

        if (songExists) {
            return res.status(400).json({ message: "Bài hát đã có trong playlist!" });
        }

        playlist.songs.push({ 
            title: songTitle, 
            artist: artist || "Unknown Artist", 
            filename
        });

        await playlist.save();
        console.log("✅ Đã thêm bài hát:", { songTitle, artist, filename });

        res.json({ message: "✅ Đã thêm bài hát vào playlist!", playlist });
    } catch (error) {
        console.error("❌ Lỗi khi thêm bài hát:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});


// load bài hát theo id playlists
app.get("/playlist/:id", authenticateToken, async (req, res) => {
    try {
        const playlistId = req.params.id;

        // Tìm playlist theo ID
        const playlist = await Playlist.findById(playlistId).populate("songs"); // 🔥 Populate để lấy thông tin chi tiết

        if (!playlist) {
            return res.status(404).json({ message: "Playlist không tồn tại!" });
        }

        // Trả về danh sách bài hát đúng định dạng
        const songList = playlist.songs.map(song => ({
            title: song.title,
            artist: song.artist || "Không rõ",
            album: song.album || "Không rõ",
            duration: song.duration || "Không rõ",
            filename: song.filename, // ✅ Thêm filename để phát nhạc
            url: `/play/${encodeURIComponent(song.filename)}`
        }));

        res.json({
            name: playlist.name,
            description: playlist.description || "",
            songs: songList
        });

    } catch (error) {
        console.error("❌ Lỗi khi lấy playlist theo ID:", error);
        res.status(500).json({ message: "Lỗi server." });
    }
});


// Thêm vào server.js
app.get("/verify-token", authenticateToken, (req, res) => {
    res.json({
        username: req.user.username,
        role: req.user.role
    });
});

// Update the album songs endpoint
app.get("/albums/:album/songs", async (req, res) => {
    const { album } = req.params;

    try {
        const songs = await Song.find({ album: album }).select("title filename"); // Lấy tiêu đề và tên file bài hát
        if (songs.length === 0) {
            return res.status(404).json({ error: "No songs found for this album" });
        }

        res.json({
            album: album,
            songs: songs.map(song => ({
                title: song.title,
                src: `${API_URL}/play/${encodeURIComponent(album)}/${encodeURIComponent(song.filename)}`
            }))
        });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Example server-side endpoint (Node.js/Express)
app.post('/songs/find', async (req, res) => {
    try {
        const { artist, filename } = req.body;

        // Query your database to find which album contains this song
        const song = await db.songs.findOne({
            where: {
                artist: artist,
                filename: filename
            },
            include: [{
                model: db.albums,
                attributes: ['name']
            }]
        });

        if (song && song.album) {
            res.json({
                album: song.album.name,
                artist: song.artist,
                filename: song.filename
            });
        } else {
            res.status(404).json({
                error: 'Song not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Server error'
        });
    }
});

app.get("/song-by-filename/:filename", async (req, res) => {
    try {
        let { filename } = req.params;
        filename = decodeURIComponent(filename).trim(); // Giải mã URL và loại bỏ khoảng trắng dư

        console.log("🔎 Đang tìm bài hát với filename:", filename);

        // Tìm kiếm bài hát trong MongoDB bằng regex, hỗ trợ lỗi dấu cách và ký tự đặc biệt
        const song = await Song.findOne({ filename: { $regex: new RegExp(filename.replace(/[-().]/g, "\\$&"), "i") } });

        if (!song) {
            console.error("❌ Không tìm thấy bài hát trong database!");
            return res.status(404).json({ error: "Không tìm thấy bài hát!" });
        }

        // Tạo URL phát nhạc
        const songUrl = `/play/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.filename)}`;
        res.json({ ...song.toObject(), url: songUrl });

    } catch (err) {
        console.error("🔥 Lỗi server:", err);
        res.status(500).json({ error: "Lỗi server khi tìm bài hát!" });
    }
});
app.use(express.json());
// Play endpoint
app.post('/api/play', (req, res) => {
    isPlaying = true;
    res.send({ message: 'Playback started', playing: isPlaying });
});
// Pause endpoint
app.post('/api/pause', (req, res) => {
    isPlaying = false;
    console.log("⏸ API: Nhạc đã dừng!");
    res.send({ message: 'Playback paused', playing: isPlaying });
});

// Status endpoint (optional)
app.get('/api/status', (req, res) => {
    res.send({ playing: isPlaying });
});
app.use("/covers", express.static(COVERS_PATH));

app.listen(PORT, () => console.log(`✅ Server chạy tại http://localhost:${PORT}`));
