const API_URL = "http://localhost:3000";
const player = document.getElementById("audioPlayer");
const nowPlaying = document.getElementById("nowPlaying");
let playlist = [];
let currentIndex = 0;
let selectedSongs = [];

async function loadSongs() {
    try {
        const response = await fetch(`${API_URL}/songs`);
        const songs = await response.json();
        const songList = document.getElementById("songList");
        songList.innerHTML = "";

        songs.forEach(song => {
            const songElement = document.createElement("div");
            songElement.className = "col-md-4 mb-3";
            songElement.innerHTML = `
                <div class="card text-white bg-secondary">
                    <div class="card-body text-center">
                        <h5 class="card-title">${song.title}</h5>
                        <p class="card-text">${song.artist}</p>
                        <button class="btn btn-outline-light btn-sm" onclick="addToPlaylist('${song.title}')">➕ Thêm vào Playlist</button>
                        <button class="btn btn-outline-danger btn-sm" onclick="likeSong('${song.title}')">❤️</button>
                    </div>
                </div>
            `;
            songList.appendChild(songElement);
        });

    } catch (error) {
        console.error("Lỗi khi tải bài hát:", error);
        alert("❌ Không thể tải danh sách bài hát!");
    }
}
async function loadAlbums() {
    try {
        const response = await fetch(`${API_URL}/albums`);
        const albums = await response.json();
        const container = document.getElementById("albumContainer");
        container.innerHTML = "";

        for (const album of albums) {
            const safeAlbum = sanitizeAlbumName(album);
            const coverResponse = await fetch(`${API_URL}/cover/${encodeURIComponent(safeAlbum)}`);
            const coverData = await coverResponse.json();
            
            const card = document.createElement("div");
            card.className = "col";
            card.innerHTML = `
                <div class="album-card h-100">
                    <div class="position-relative overflow-hidden">
                        <img src="${coverData.coverUrl}" 
                             class="album-cover" 
                             alt="${album.replace(/"/g, '&quot;')}"
                             onerror="this.src='default-cover.jpg'">
                        <div class="album-hover-effect"></div>
                    </div>
                    <div class="album-info">
                        <div class="album-title text-truncate">${album}</div>
                        <div class="album-meta">
                            <i class="fas fa-music me-1"></i>
                            <span class="song-count">10 bài hát</span>
                        </div>
                    </div>
                </div>
            `;

            card.onclick = () => loadPlaylist(album);
            container.appendChild(card);
        }
    } catch (error) {
        console.error("Lỗi tải album:", error);
        alert("❌ Không thể tải danh sách album!");
    }
}
function initAlbumHoverEffect() {
    const albumCards = document.querySelectorAll('.album-card');
    
    albumCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            document.body.style.setProperty('--album-bg', `url(${card.querySelector('img').src})`);
            document.body.classList.add('album-hover');
        });
        
        card.addEventListener('mouseleave', () => {
            document.body.classList.remove('album-hover');
        });
    });
}
async function createRandomAlbum() {
    const response = await fetch(`${API_URL}/all-songs`);
    const allSongs = await response.json();
    if (allSongs.length === 0) return;

    const randomSongs = allSongs.sort(() => 0.5 - Math.random()).slice(0, 10); // Lấy ngẫu nhiên 10 bài
    const albumName = "Ngẫu Nhiên";
    
    const div = document.createElement("div");
    div.className = "album";
    div.innerHTML = `
        <p>${albumName}</p>
        <img src="default-cover.jpg" alt="${albumName}">
    `;
    div.onclick = () => {
        playlist = randomSongs;
        currentIndex = 0;
        document.getElementById("albums").classList.add("hidden");
        document.getElementById("playlist").classList.remove("hidden");
        displayPlaylist();
        playSong();
    };
    document.getElementById("albums").appendChild(div);
}

async function showSongList() {
    const response = await fetch(`${API_URL}/songs`);
    const songs = await response.json();
    const container = document.getElementById("songList");
    container.innerHTML = "";
    container.classList.remove("hidden");

    songs.forEach(song => {
        const div = document.createElement("div");
        div.className = "song";
        div.innerHTML = `<p>${song.title} - ${song.artist}</p>`;
        div.onclick = () => {
            if (!selectedSongs.includes(song.title)) {
                selectedSongs.push(song.title);
                const songItem = document.createElement("div");
                songItem.className = "playlist-item";
                songItem.textContent = song.title;
                document.getElementById("playlist").appendChild(songItem);
            }
        };
        container.appendChild(div);
    });

    const doneButton = document.createElement("button");
    doneButton.className = "btn";
    doneButton.textContent = "Xong";
    doneButton.onclick = createPlasavePlaylistylist;
    container.appendChild(doneButton);
}
async function addToExistingPlaylist(songTitle) {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("❌ Bạn chưa đăng nhập!");
        return;
    }

    const response = await fetch(`${API_URL}/playlist`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    const playlists = await response.json();
    let playlistOptions = playlists.map(pl => pl.name).join("\n");

    const chosenPlaylist = prompt(`Chọn playlist để thêm bài hát:\n${playlistOptions}\nHoặc nhập tên mới:`);

    if (!chosenPlaylist) return;

    const existingPlaylist = playlists.find(pl => pl.name === chosenPlaylist);

    if (existingPlaylist) {
        existingPlaylist.songs.push(songTitle);
        await fetch(`${API_URL}/playlist/${existingPlaylist._id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ songs: existingPlaylist.songs })
        });
        alert("✅ Đã thêm vào Playlist!");
    } else {
        savePlaylist(chosenPlaylist, [songTitle]);
    }
}

async function savePlaylist(playlistName, songs) {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("❌ Bạn chưa đăng nhập!");
        return;
    }

    const response = await fetch(`${API_URL}/playlist`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: playlistName, songs })
    });

    if (response.ok) {
        alert("✅ Playlist mới đã được tạo!");
    } else {
        alert("❌ Lỗi khi tạo playlist!");
    }
}

async function viewCreatedPlaylist(name) {
    const response = await fetch(`${API_URL}/playlist`, {
        headers: {
            "Authorization": localStorage.getItem("token")
        }
    });

    if (response.ok) {
        const playlists = await response.json();
        const playlist = playlists.find(pl => pl.name === name);
        if (playlist) {
            const container = document.getElementById("playlist");
            container.innerHTML = "";
            playlist.songs.forEach(song => {
                const div = document.createElement("div");
                div.className = "song";
                div.innerHTML = `<p>${song}</p>`;
                container.appendChild(div);
            });
        }
    } else {
        alert("Lỗi khi tải playlist.");
    }
}
async function viewFavorites() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("❌ Bạn chưa đăng nhập!");
        return;
    }

    const response = await fetch(`${API_URL}/favorite`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await response.json();
    const favoriteContainer = document.getElementById("likedSongs");
    favoriteContainer.innerHTML = "";
    favoriteContainer.classList.remove("hidden");

    if (response.ok) {
        data.forEach(song => {
            const songElement = document.createElement("div");
            songElement.className = "col-md-4 p-2";
            songElement.innerHTML = `
                <div class="card bg-dark text-white">
                    <div class="card-body text-center">
                        <p class="card-title">${song.title}</p>
                        <button class="btn btn-outline-primary btn-sm" onclick="addToExistingPlaylist('${song.title}')">➕ Thêm vào Playlist</button>
                    </div>
                </div>
            `;
            favoriteContainer.appendChild(songElement);
        });
    } else {
        alert("❌ Lỗi khi tải danh sách yêu thích!");
    }
}

async function saveToFavorites() {
    if (playlist.length > 0) {
        const song = playlist[currentIndex];
        const response = await fetch(`${API_URL}/favorite`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ title: song.title })
        });

        if (response.ok) {
            alert("Đã thêm vào danh sách yêu thích!");
        } else {
            alert("Lỗi khi thêm vào danh sách yêu thích.");
        }
    }
}


async function likeSong(songTitle) {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("❌ Bạn chưa đăng nhập!");
        return;
    }

    const res = await fetch(`${API_URL}/favorite`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: songTitle })
    });

    const data = await res.json();
    if (!res.ok) alert(`❌ Lỗi: ${data.message}`);
}

async function loadPlaylist(album) {
    const response = await fetch(`${API_URL}/songs?album=${encodeURIComponent(album)}`);
    playlist = await response.json();
    currentIndex = 0;
    document.getElementById("albums").classList.add("hidden");
    document.getElementById("playlist").classList.remove("hidden");
    displayPlaylist();
    playSong();
}

function playSong() {
    if (playlist.length > 0) {
        const song = playlist[currentIndex];
        player.src = `${API_URL}/play/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.filename)}`;
        nowPlaying.innerText = `Đang phát: ${song.title}`;
        
        // Thêm phần này để xử lý autoplay
        player.load();
        player.play().catch(error => {
            console.log('Autoplay bị chặn, cần tương tác người dùng');
        });
    }
}

function nextSong() {
    if (playlist.length > 0) {
        currentIndex = (currentIndex + 1) % playlist.length;
        playSong();
    }
}

function prevSong() {
    if (playlist.length > 0) {
        currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        playSong();
    }
}

function togglePlayPause() {
    if (player.paused) {
        player.play();
    } else {
        player.pause();
    }
}

function toggleRepeat() {
    player.loop = !player.loop;
    alert(`Lặp lại: ${player.loop ? "Bật" : "Tắt"}`);
}

function toggleAlbums() {
    document.getElementById("albums").classList.toggle("hidden");
    document.getElementById("playlist").classList.add("hidden");
}

function showAlbums() {
    document.getElementById("albums").classList.remove("hidden");
    document.getElementById("playlist").classList.add("hidden");
    document.body.classList.remove("album-hover");
}

function displayPlaylist() {
    const container = document.getElementById("playlist");
    container.innerHTML = "";
    playlist.forEach((song, index) => {
        const div = document.createElement("div");
        div.className = "song";
        div.innerHTML = `<p>${index + 1}. ${song.title}</p>`;
        div.onclick = () => {
            currentIndex = index;
            playSong();
        };
        container.appendChild(div);
    });
}

function sanitizeAlbumName(album) {
    return album.replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g, "").trim();
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = "block";
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

function toggleUserOptions() {
    const token = localStorage.getItem("token");
    if (token) {
        const username = localStorage.getItem("username");
        document.querySelector('.user-options').innerHTML = `
            <p>Xin chào, ${username}</p>
            <button onclick="logout()">Đăng Xuất</button>
        `;
    } else {
        openModal('loginModal');
    }
}

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    // Handle login logic here
    closeModal('loginModal');
});

let audio = new Audio('path/to/your/music/file.mp3');

document.getElementById('loginForm').onsubmit = async function(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    const result = await response.json();
    if (response.ok) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("username", username);
        updateUI(username);
        closeModal('loginModal');
    } else {
        alert(`Lỗi: ${result.message}`);
    }
};

document.getElementById('registerForm').onsubmit = async function(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    const result = await response.json();
    if (response.ok) {
        alert("Đăng ký thành công! Vui lòng đăng nhập.");
        closeModal('registerModal');
    } else {
        alert(`Lỗi: ${result.message}`);
    }
};

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    document.querySelector('.user-options').innerHTML = `
        <button class="btn bg-blue-500 text-white py-2 px-4 rounded" onclick="openModal('loginModal')">Đăng Nhập</button>
        <button class="btn bg-blue-500 text-white py-2 px-4 rounded" onclick="openModal('registerModal')">Đăng Ký</button>
    `;
    alert('Đã đăng xuất');
}

function updateUI(username) {
    document.querySelector('.user-options').innerHTML = `
        <p>Xin chào, ${username}</p>
        <button onclick="logout()">Đăng Xuất</button>
    `;
}

function resetBackground() {
    document.body.classList.remove("album-hover");
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const albumsContainer = document.getElementById("albums");
    loadAlbums().then(initAlbumHoverEffect);
    albumsContainer.addEventListener("mouseover", (event) => {
        const album = event.target.closest(".album");
        if (album) {
            const img = album.querySelector("img").src;
            document.body.style.setProperty("--album-bg", `url(${img})`);
            document.body.classList.add("album-hover");
        }
    });

    albumsContainer.addEventListener("mouseleave", () => {
        document.body.classList.remove("album-hover");
    });

    const sidebar = document.querySelector(".sidebar");
    document.body.addEventListener("mousemove", (event) => {
        if (event.clientX > window.innerWidth - 50) {
            sidebar.classList.add("show");
        } else {
            sidebar.classList.remove("show");
        }
    });

    loadAlbums();
    const token = localStorage.getItem("token");
    if (token) {
        const username = localStorage.getItem("username");
        updateUI(username);
    }
    function toggleUserOptions() {
        const token = localStorage.getItem("token");
        const userIcon = document.querySelector("box-icon[name='user-circle']");
        
        if (token) {
            const username = localStorage.getItem("username");
            userIcon.outerHTML = `<p class="text-white cursor-pointer">${username}</p>`;
        } else {
            openModal('loginModal');
        }
    }
    async function addToPlaylist(songTitle) {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("❌ Bạn chưa đăng nhập!");
            return;
        }
    
        const response = await fetch(`${API_URL}/playlist`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
    
        const playlists = await response.json();
        let playlistOptions = playlists.map(pl => pl.name).join("\n");
    
        const chosenPlaylist = prompt(`Chọn Playlist hoặc nhập tên mới:\n${playlistOptions}`);
    
        if (!chosenPlaylist) return;
    
        const existingPlaylist = playlists.find(pl => pl.name === chosenPlaylist);
    
        if (existingPlaylist) {
            existingPlaylist.songs.push(songTitle);
            await fetch(`${API_URL}/playlist/${existingPlaylist._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ songs: existingPlaylist.songs })
            });
            alert("✅ Đã thêm vào Playlist!");
        } else {
            savePlaylist(chosenPlaylist, [songTitle]);
        }
    }
    
    async function savePlaylist(playlistName, songs) {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("❌ Bạn chưa đăng nhập!");
            return;
        }
    
        const response = await fetch(`${API_URL}/playlist`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ name: playlistName, songs })
        });
    
        if (response.ok) {
            alert("✅ Playlist mới đã được tạo!");
        } else {
            alert("❌ Lỗi khi tạo playlist!");
        }
    }
    
});