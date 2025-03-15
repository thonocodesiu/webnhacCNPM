class AudioPlayer {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.sound = null;
        this.playlist = [];
        this.currentTrack = null;
        this.isPlaying = false;
        this.currentIndex = 0;
        this.isShuffleOn = false;
        this.isRepeatOn = false;
        this.volume = 1.0;
        this.currentSongData = null;
        this.previousVolume = 1.0;
        this.playlists = []; // Store available playlists
        
        this.initializeHowler();
        this.createPlayer();
        this.setupLogoutListener();
    }

    initializeHowler() {
        // Single place for Howler configuration
        Howler.autoUnlock = true;
        Howler.html5PoolSize = 10;
        Howler.usingWebAudio = true;
        Howler.autoSuspend = false;
    }

    async playSong(index) {
        try {
            if (!this.playlist || !this.playlist[index]) {
                throw new Error("❌ Index bài hát không hợp lệ!");
            }
    
            if (this.currentIndex === index && this.sound) {
                console.log("🔄 Bài hát này đã được phát, resume thay vì load lại!");
                this.resume();
                return;
            }
    
            this.currentIndex = index;
            const song = this.playlist[index];
    
            console.log(`🎵 Đang phát bài hát: ${song.title}`);
    
            await this.loadTrack(song.src, song.title, song.artist);
            this.updatePlayPauseUI();
    
        } catch (error) {
            console.error("❌ Lỗi khi phát bài hát:", error);
        }
    }

    createPlayer() {
        const playerHTML = `
            <div class="audio-player bg-gray-900 fixed bottom-0 left-0 right-0 p-1">
                <div class="flex items-center justify-between max-w-6xl mx-auto">
                    <!-- Song Info Section -->
                    <div class="flex flex-col w-1/4">
                        <div class="flex items-center gap-2">
                            <div class="song-title-container overflow-hidden">
                                <span id="song-title" class="font-bold text-white text-lg truncate">Select a song</span>
                            </div>
                            <!-- Add playlist button -->
                            <button id="addToPlaylistBtn" class="text-gray-400 hover:text-white transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                </svg>
                            </button>
                            <button id="likeBtn" class="text-gray-400 hover:text-red-500 transition-colors">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                            </button>
                        </div>
                        <span id="artist" class="text-gray-400 text-sm truncate">Unknown Artist</span>
                    </div>

                    <div class="flex flex-col items-center w-2/4">
                        <div class="flex items-center space-x-6">
                            <button id="shuffleBtn" class="text-gray-400 hover:text-white transition">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M17.5,13.5h-2.2c-0.2,0-0.4,0.1-0.6,0.3l-1.8,1.8c-0.3,0.3-0.3,0.8,0,1.1s0.8,0.3,1.1,0L15.3,15h2.2c0.4,0,0.7-0.3,0.7-0.7
                                    S17.9,13.5,17.5,13.5z M17.5,6.5h-2.2l-1.8-1.8c-0.3-0.3-0.8-0.3-1.1,0s-0.3,0.8,0,1.1l1.8,1.8c0.2,0.2,0.4,0.3,0.6,0.3h2.2
                                    c0.4,0,0.7-0.3,0.7-0.7S17.9,6.5,17.5,6.5z M7.9,13.5H2.5c-0.4,0-0.7,0.3-0.7,0.7s0.3,0.7,0.7,0.7h5.4c0.4,0,0.7-0.3,0.7-0.7
                                    S8.3,13.5,7.9,13.5z M7.9,6.5H2.5c-0.4,0-0.7,0.3-0.7,0.7s0.3,0.7,0.7,0.7h5.4c0.4,0,0.7-0.3,0.7-0.7S8.3,6.5,7.9,6.5z"/>
                                </svg>
                            </button>
                            <button id="prevBtn" class="text-white">
                                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                                </svg>
                            </button>
                            <button id="playPauseBtn" class="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition">
                                <svg class="w-6 h-6 play-icon" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                                <svg class="w-6 h-6 pause-icon hidden" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                </svg>
                            </button>
                            <button id="nextBtn" class="text-white">
                                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                                </svg>
                            </button>
                            <button id="repeatBtn" class="text-gray-400 hover:text-white transition">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M17.5,6.5h-15c-0.4,0-0.7,0.3-0.7,0.7s0.3,0.7,0.7,0.7h13.7l-1.8,1.8c-0.3,0.3-0.3,0.8,0,1.1c0.1,0.1,0.3,0.2,0.5,0.2
                                    s0.4-0.1,0.5-0.2l3.2-3.2c0.3-0.3,0.3-0.8,0-1.1L14.9,3.3c-0.3-0.3-0.8-0.3-1.1,0s-0.3,0.8,0,1.1l1.8,1.8H2.5
                                    c-0.4,0-0.7,0.3-0.7,0.7s0.3,0.7,0.7,0.7h15c0.4,0,0.7-0.3,0.7-0.7S17.9,6.5,17.5,6.5z"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="w-full mt-2 flex items-center space-x-3">
                            <span id="currentTime" class="text-xs text-gray-400">0:00</span>
                            <div class="progress-bar flex-1 h-1 bg-gray-700 rounded-full cursor-pointer">
                                <div class="progress h-full bg-white rounded-full" style="width: 0%"></div>
                            </div>
                            <span id="duration" class="text-xs text-gray-400">0:00</span>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-3 w-1/4 justify-end">
                        <button id="volumeBtn" class="text-gray-400 hover:text-white">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                            </svg>
                        </button>
                        <input type="range" id="volume" class="w-24" min="0" max="100" value="100">
                    </div>
                </div>
            </div>
            
            <!-- Playlist Modal -->
            <div id="playlistModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center">
                <div class="bg-gray-800 p-6 rounded-lg w-96">
                    <h3 class="text-white text-lg font-bold mb-4">Add to Playlist</h3>
                    <div id="existingPlaylists" class="mb-4 max-h-60 overflow-y-auto">
                        <!-- Playlists will be inserted here -->
                    </div>
                    <button id="newPlaylistBtn" class="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 mb-2">
                        Create New Playlist
                    </button>
                    <button id="closePlaylistModal" class="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700">
                        Cancel
                    </button>
                </div>
            </div>
            
            <!-- Notification System -->
            <div id="notificationSystem" class="fixed top-4 right-4 z-50 space-y-4"></div>`;

        const container = document.createElement("div");
        container.innerHTML = playerHTML;
        document.body.appendChild(container);
        
        this.initControls();
    }

    initControls() {
        this.elements = {
            playPauseBtn: document.getElementById("playPauseBtn"),
            prevBtn: document.getElementById("prevBtn"),
            nextBtn: document.getElementById("nextBtn"),
            shuffleBtn: document.getElementById("shuffleBtn"),
            repeatBtn: document.getElementById("repeatBtn"),
            volumeBtn: document.getElementById("volumeBtn"),
            volumeSlider: document.getElementById("volume"),
            progressBar: document.querySelector(".progress-bar"),
            progress: document.querySelector(".progress"),
            currentTime: document.getElementById("currentTime"),
            duration: document.getElementById("duration"),
            playIcon: document.querySelector(".play-icon"),
            pauseIcon: document.querySelector(".pause-icon"),
            likeBtn: document.getElementById("likeBtn"),
            addToPlaylistBtn: document.getElementById("addToPlaylistBtn"),
            playlistModal: document.getElementById("playlistModal"),
            closePlaylistModal: document.getElementById("closePlaylistModal"),
            newPlaylistBtn: document.getElementById("newPlaylistBtn"),
            existingPlaylists: document.getElementById("existingPlaylists")
        };

        this.bindEvents();
    }

    bindEvents() {
        this.elements.playPauseBtn.addEventListener("click", () => this.togglePlay());
        this.elements.prevBtn.addEventListener("click", () => this.prevTrack());
        this.elements.nextBtn.addEventListener("click", () => this.nextTrack());
        this.elements.shuffleBtn.addEventListener("click", () => this.toggleShuffle());
        this.elements.repeatBtn.addEventListener("click", () => this.toggleRepeat());
        this.elements.volumeBtn.addEventListener("click", () => this.toggleMute());
        this.elements.volumeSlider.addEventListener("input", (e) => this.updateVolume(e.target.value));
        this.elements.progressBar.addEventListener("click", (e) => this.seek(e));
        this.elements.likeBtn.addEventListener("click", () => this.toggleLike());
        this.elements.addToPlaylistBtn.addEventListener("click", () => this.showPlaylistModal());
        this.elements.closePlaylistModal.addEventListener("click", () => this.hidePlaylistModal());
        this.elements.newPlaylistBtn.addEventListener("click", () => this.createNewPlaylist());

        // Replace setInterval with more efficient RAF
        this.progressInterval = null;
        const updateProgressLoop = () => {
            this.updateProgress();
            if (this.isPlaying) {
                this.progressInterval = requestAnimationFrame(updateProgressLoop);
            }
        };
        
        this.elements.playPauseBtn.addEventListener("click", () => {
            this.togglePlay();
            if (this.isPlaying) {
                updateProgressLoop();
            } else {
                cancelAnimationFrame(this.progressInterval);
            }
        });
    }

    async toggleLike() {
        if (!this.currentSongData || !this.currentSongData.title) {
            console.warn("No song is currently playing");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            alert("Vui lòng đăng nhập để thêm vào yêu thích");
            return;
        }

        try {
            const favorites = await this.getFavorites();
            const isCurrentlyLiked = favorites.some(fav => fav.title === this.currentSongData.title);

            if (isCurrentlyLiked) {
                // Remove from favorites using DELETE
                await this.removeFavorite(this.currentSongData.title);
                this.elements.likeBtn.classList.remove("text-red-500");
                this.elements.likeBtn.classList.add("text-gray-400");
                this.showNotification("Đã xóa khỏi danh sách yêu thích", "warning");
            } else {
                // Add to favorites using POST
                await this.addFavorite(this.currentSongData);
                this.elements.likeBtn.classList.add("text-red-500");
                this.elements.likeBtn.classList.remove("text-gray-400");
                this.showNotification("Đã thêm vào danh sách yêu thích", "like");
            }

            // Update UI
            document.dispatchEvent(new CustomEvent('likeStatusChanged', {
                detail: {
                    title: this.currentSongData.title,
                    isLiked: !isCurrentlyLiked
                }
            }));

        } catch (error) {
            console.error("Error toggling like:", error);
            this.showNotification("❌ Không thể cập nhật trạng thái yêu thích", "error");
        }
    }

    async loadTrack(url, title, artist, index = null) {
        try {
            if (index !== null) {
                this.currentIndex = index; // ✅ Cập nhật currentIndex khi có index truyền vào
            }
    
            if (this.sound) {
                this.sound.unload();
            }
    
            const fileType = this.getFileType(url);
            const format = this.getAudioFormat(fileType);
    
            this.sound = new Howl({
                src: [url],
                format: [format],
                html5: true,
                preload: true,
                xhr: {
                    headers: {
                        'Range': 'bytes=0-',
                        'Accept': 'audio/*'
                    }
                },
                onload: () => {
                    console.log(`✅ Đã tải bài hát: ${title}`);
                    this.updateNowPlaying(title, artist);
                },
                onplay: () => {
                    this.isPlaying = true;
                    this.updatePlayPauseUI();
                    this.startProgressUpdate();
                },
                onpause: () => {
                    this.isPlaying = false;
                    this.updatePlayPauseUI();
                },
                onend: () => {
                    if (this.isRepeatOn) {
                        console.log("🔁 Lặp lại bài hát...");
                        this.sound.play(); // ✅ Không gọi `playSong(this.currentIndex)`, chỉ phát lại
                    } else {
                        console.log("🎶 Bài hát kết thúc, phát bài tiếp theo...");
                        this.nextTrack();
                    }
                }
            });
    
            this.sound.play();
            this.updateVolume(this.volume * 100);
            this.currentSongData = { title, artist, filename: url.split('/').pop() };
            await this.checkLikeStatus(title);
    
            return true;
        } catch (error) {
            console.error('❌ Lỗi tải bài hát:', error);
            return false;
        }
    }
    

    toggleRepeat() {
        this.isRepeatOn = !this.isRepeatOn;
        this.elements.repeatBtn.classList.toggle("text-green-500", this.isRepeatOn);
        console.log("🔁 Chế độ lặp lại:", this.isRepeatOn ? "Bật" : "Tắt");
    }
    toggleShuffle() {
        this.isShuffleOn = !this.isShuffleOn;
        this.elements.shuffleBtn.classList.toggle("text-green-500", this.isShuffleOn);
        console.log("🔀 Chế độ xáo trộn:", this.isShuffleOn ? "Bật" : "Tắt");
        
        if (this.isShuffleOn) {
            this.originalPlaylist = [...this.playlist]; // Lưu danh sách gốc
            this.playlist = this.shuffleArray([...this.playlist]);
            this.currentIndex = 0; // Reset về bài đầu trong danh sách xáo trộn
        } else {
            const currentSong = this.playlist[this.currentIndex]; // Lưu bài hát đang phát
            this.playlist = [...this.originalPlaylist]; // Khôi phục danh sách gốc
            this.currentIndex = this.playlist.findIndex(song => song.title === currentSong.title); // Giữ bài hát hiện tại
        }
    }
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    async checkLikeStatus(title) {
        if (!title) return false;
        
        try {
            const likedSongs = JSON.parse(localStorage.getItem('likedSongs') || '[]');
            const isLiked = likedSongs.some(song => song.title === title);
            
            // Update UI
            if (isLiked) {
                this.elements.likeBtn.classList.add("text-red-500");
                this.elements.likeBtn.classList.remove("text-gray-400");
            } else {
                this.elements.likeBtn.classList.remove("text-red-500");
                this.elements.likeBtn.classList.add("text-gray-400");
            }

            return isLiked;
        } catch (error) {
            console.error("Error checking like status:", error);
            return false;
        }
    }

    getFileType(url) {
        return url.split('.').pop().toLowerCase();
    }

    getAudioFormat(fileType) {
        const formatMap = {
            'mp3': 'mp3',
            'flac': 'flac',
            'wav': 'wav',
            'ogg': 'ogg',
            'm4a': 'mp4',
            'm3': 'mpeg'
        };
        return formatMap[fileType] || 'mp3';
    }

    handleError(message) {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            const errorText = errorEl.querySelector('.error-text');
            if (errorText) {
                errorText.textContent = message;
                errorEl.classList.remove('hidden');
                setTimeout(() => errorEl.classList.add('hidden'), 5000);
            }
        }
    }

    updateNowPlaying(title, artist) {
        const titleEl = document.getElementById('song-title');
        const artistEl = document.getElementById('artist');
        
        if (titleEl) titleEl.textContent = title || 'Unknown Title';
        if (artistEl) artistEl.textContent = artist || 'Unknown Artist';
    }

    startProgressUpdate() {
        // Cancel existing progress update if any
        if (this.progressInterval) {
            cancelAnimationFrame(this.progressInterval);
        }

        const updateProgressLoop = () => {
            this.updateProgress();
            if (this.isPlaying) {
                this.progressInterval = requestAnimationFrame(updateProgressLoop);
            }
        };

        updateProgressLoop();
    }

    updateProgress() {
        if (!this.sound) return;

        const seek = this.sound.seek() || 0;
        const duration = this.sound.duration() || 0;

        // Update time displays
        this.elements.currentTime.textContent = this.formatTime(seek);
        this.elements.duration.textContent = this.formatTime(duration);

        // Update progress bar
        if (duration > 0) {  // Avoid division by zero
            this.elements.progress.style.width = `${(seek / duration) * 100}%`;
        }
    }

    async checkLikeStatus(title) {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const response = await fetch(`${this.apiUrl}/favorite`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const favorites = await response.json();
            const isLiked = favorites.some(fav => fav.title === title);
            
            if (isLiked) {
                this.elements.likeBtn.classList.add("text-red-500");
                this.elements.likeBtn.classList.remove("text-gray-400");
            } else {
                this.elements.likeBtn.classList.add("text-gray-400");
                this.elements.likeBtn.classList.remove("text-red-500");
            }
        } catch (error) {
            console.error("Error checking like status:", error);
        }
    }
    
    async togglePlay() {
        try {
            if (!this.sound) {
                console.warn("⚠️ No audio loaded");
                return;
            }
    
            // Nếu nhạc đang phát → Tạm dừng
            if (this.sound.playing()) {
                await this.pause();
                return; // ✅ Thoát luôn để không chạy xuống resume()
            }
    
            // Nếu nhạc đang tạm dừng → Resume
            await this.resume();
            // alert("Xin chào Minh Thông! 🎵"); // ✅ Chỉ hiện khi resume thành công
        } catch (error) {
            console.error("❌ Error toggling play/pause:", error);
        }
    }
    
    

    
    

    updatePlayPauseUI() {
        const playIcon = this.elements.playIcon;
        const pauseIcon = this.elements.pauseIcon;
    
        if (!playIcon || !pauseIcon) return;
    
        if (this.isPlaying) {
            playIcon.classList.add("hidden");
            pauseIcon.classList.remove("hidden");
        } else {
            playIcon.classList.remove("hidden");
            pauseIcon.classList.add("hidden");
        }
    }
    

    formatTime(secs) {
        const minutes = Math.floor(secs / 60);
        const seconds = Math.floor(secs % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    seek(e) {
        if (!this.sound) return;

        const percent = e.offsetX / this.elements.progressBar.offsetWidth;
        const seekTime = percent * this.sound.duration();
        this.sound.seek(seekTime);
    }

    updateVolume(value) {
        const volume = parseFloat(value) / 100;
        this.volume = volume;
        if (this.sound) {
            this.sound.volume(volume);
        }
    }

    toggleMute() {
        if (!this.sound) return;
        
        if (this.sound.volume() > 0) {
            this.previousVolume = this.sound.volume();
            this.sound.volume(0);
            this.elements.volumeSlider.value = 0;
        } else {
            this.sound.volume(this.previousVolume);
            this.elements.volumeSlider.value = this.previousVolume * 100;
        }
    }

    setupLogoutListener() {
        window.addEventListener('storage', (e) => {
            // Listen for token removal (logout)
            if (e.key === 'token' && !e.newValue) {
                if (this.sound) {
                    this.sound.unload(); // Stop and cleanup current audio
                }
            }
        });
    }

    updatePlayingState(index) {
        if (!this.playlist || this.playlist.length === 0) return;
    
        // Xóa class 'playing' khỏi tất cả bài hát
        document.querySelectorAll('.song-item').forEach(item => item.classList.remove('playing'));
    
        // Kiểm tra phần tử có tồn tại không
        const songItems = document.querySelectorAll('.song-item');
        if (songItems[index]) {
            songItems[index].classList.add('playing');
    
            // Cuộn đến bài hát đang phát
            songItems[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    
            // Cập nhật tiêu đề bài hát đang phát
            const nowPlayingTitle = document.getElementById("nowPlayingTitle");
            const nowPlayingArtist = document.getElementById("nowPlayingArtist");
    
            if (nowPlayingTitle && nowPlayingArtist) {
                nowPlayingTitle.textContent = this.playlist[index].title;
                nowPlayingArtist.textContent = this.playlist[index].artist;
            }
        } else {
            console.warn("⚠️ Không tìm thấy phần tử bài hát để cập nhật UI!");
        }
    }
    
    nextTrack() {
        if (!this.playlist || this.playlist.length === 0) return;
        
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.playSongByFilename(this.currentIndex);
    
        // Gửi sự kiện trackChanged để cập nhật UI
        document.dispatchEvent(new CustomEvent('trackChanged', { detail: { currentIndex: this.currentIndex } }));
    }
    
    prevTrack() {
        if (!this.playlist || this.playlist.length === 0) return;
    
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.playSongByFilename(this.currentIndex);
    
        // Gửi sự kiện trackChanged để cập nhật UI
        document.dispatchEvent(new CustomEvent('trackChanged', { detail: { currentIndex: this.currentIndex } }));
    }
    
    
    

    cleanup() {
        if (this.sound) {
            this.sound.unload();
        }
        if (this.currentSource) {
            this.currentSource.stop();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        clearInterval(this.progressInterval);
    }
    setPlaylist(playlist) {
        if (!Array.isArray(playlist) || playlist.length === 0) {
            console.warn("⚠️ Không thể gán playlist, danh sách bài hát rỗng!");
            return;
        }
    
        this.playlist = [...playlist]; // ✅ Sao chép mảng để tránh lỗi tham chiếu
        this.currentIndex = 0; // ✅ Reset index về bài đầu tiên
    
        console.log("✅ Playlist đã được gán:", this.playlist);
    }
    

    async playSongByFilename(index) {
        try {
            const song = this.playlist[index];
            if (!song) {
                console.warn("⚠️ Bài hát không tồn tại trong playlist.");
                return;
            }
    
            const songUrl = `${this.apiUrl}/play/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.filename)}`;
            await this.loadTrack(songUrl, song.title, song.artist);
    
            this.currentIndex = index;
            
            // Cập nhật UI
            this.updatePlayingState(index);
        } catch (error) {
            console.error("❌ Lỗi khi phát bài hát:", error);
        }
    }
    
    
    
    async pause() {
    try {
        // Gọi API cập nhật trạng thái trên server
        const response = await fetch(`${this.apiUrl}/api/pause`, { method: "POST" });
        const data = await response.json();
        this.isPlaying = data.playing;
        
        // Chỉ tạm dừng bài hát, không xóa this.sound
        if (this.sound && this.sound.playing()) {
            this.sound.pause(); // 🛑 Không dùng stop()
        }
        
        // Cập nhật UI
        this.updatePlayPauseUI();
        console.log("⏸ Audio paused");
    } catch (error) {
        console.error("Error pausing audio:", error);
    }
}

    
    

async resume() {
    try {
        // Gọi API để cập nhật trạng thái trên server
        const response = await fetch(`${this.apiUrl}/api/play`, { method: "POST" });
        const data = await response.json();
        this.isPlaying = data.playing;

        // Nếu nhạc chưa được load hoặc không có this.sound, không làm gì cả
        if (!this.sound) {
            console.warn("⚠️ Không có bài hát nào để tiếp tục phát!");
            return;
        }

        // Kiểm tra nếu nhạc đã dừng nhưng chưa unload, thì chỉ play()
        if (!this.sound.playing()) {
            this.sound.play();
        }

        // Cập nhật UI
        this.updatePlayPauseUI();
        console.log("▶ Audio resumed via API & Howler.js (Không load lại track)");
    } catch (error) {
        console.error("❌ Error resuming audio:", error);
    }
}


    
    async toggleLike() {
        if (!this.currentSongData || !this.currentSongData.title) {
            console.warn("No song is currently playing");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            alert("Vui lòng đăng nhập để thêm vào yêu thích");
            return;
        }

        try {
            // Check current like status
            const favorites = await this.getFavorites();
            const isCurrentlyLiked = favorites.some(fav => fav.title === this.currentSongData.title);

            if (isCurrentlyLiked) {
                // Remove from favorites
                await this.removeFavorite(this.currentSongData.title);
                this.elements.likeBtn.classList.remove("text-red-500");
                this.elements.likeBtn.classList.add("text-gray-400");
                this.showNotification("Đã xóa khỏi danh sách yêu thích", "warning");
            } else {
                // Add to favorites
                await this.addFavorite(this.currentSongData);
                this.elements.likeBtn.classList.add("text-red-500");
                this.elements.likeBtn.classList.remove("text-gray-400");
                this.showNotification("Đã thêm vào danh sách yêu thích", "like");
            }

            // Dispatch event for UI updates
            document.dispatchEvent(new CustomEvent('likeStatusChanged', {
                detail: {
                    title: this.currentSongData.title,
                    isLiked: !isCurrentlyLiked
                }
            }));

        } catch (error) {
            console.error("Error toggling like:", error);
            this.handleError("Không thể cập nhật trạng thái yêu thích. Vui lòng thử lại.");
        }
    }

    async getFavorites() {
        const token = localStorage.getItem("token");
        if (!token) return [];

        const response = await fetch(`${this.apiUrl}/favorite`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch favorites");
        }

        return await response.json();
    }

    async addFavorite(songData) {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(`${this.apiUrl}/favorite`, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: songData.title,
                artist: songData.artist,
                filename: songData.filename
            })
        });

        if (!response.ok) {
            throw new Error("Failed to add favorite");
        }

        return await response.json();
    }

    async removeFavorite(title) {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(`${this.apiUrl}/favorite`, {
            method: 'DELETE', // Changed from POST to DELETE
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title })
        });

        if (!response.ok) {
            throw new Error("Failed to remove from favorites");
        }

        return await response.json();
    }

    

    hidePlaylistModal() {
        this.elements.playlistModal.classList.add("hidden");
        this.elements.playlistModal.classList.remove("flex");
    }

    async createNewPlaylist() {
        const name = prompt("Nhập tên playlist:");
        if (!name) return;
    
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("⚠️ Vui lòng đăng nhập!");
                return;
            }
    
            // 🟢 Không yêu cầu bài hát, playlist có thể trống
            const requestData = {
                name: name,
                description: "Playlist mới",
                songs: []
            };
    
            // Nếu đang phát bài hát, thêm vào playlist mới
            if (this.currentSongData && this.currentSongData.title) {
                requestData.songs.push({
                    title: this.currentSongData.title,
                    artist: this.currentSongData.artist || "Unknown Artist",
                    filename: this.currentSongData.filename || "Unknown Filename"
                });
            }
    
            console.log("📤 Dữ liệu gửi lên API (Tạo playlist):", requestData);
    
            const response = await fetch(`${this.apiUrl}/playlist`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestData)
            });
    
            if (!response.ok) {
                throw new Error(await response.text());
            }
    
            alert("✅ Playlist đã được tạo!");
            this.hidePlaylistModal();
            this.showNotification(`Đã tạo playlist '${name}' thành công!`, "success");
    
        } catch (error) {
            console.error("❌ Lỗi khi tạo playlist:", error);
            this.handleError("Không thể tạo playlist!");
        }
    }
    
    



    async addToPlaylist(playlistId) {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("⚠️ Vui lòng đăng nhập!");
                return;
            }
    
            if (!this.currentSongData || !this.currentSongData.title || !this.currentSongData.filename) {
                alert("⚠️ Không có bài hát hợp lệ để thêm vào playlist!");
                console.error("🚨 currentSongData bị thiếu dữ liệu:", this.currentSongData);
                return;
            }
    
            const requestData = {
                songTitle: this.currentSongData.title,
                artist: this.currentSongData.artist || "Unknown Artist",
                filename: decodeURIComponent(this.currentSongData.filename)
            };
    
            console.log("📤 Dữ liệu gửi lên API:", requestData); // Kiểm tra dữ liệu gửi đi
    
            const response = await fetch(`${this.apiUrl}/playlist/${playlistId}`, {
                method: 'PUT',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestData)
            });
    
            const data = await response.json();
            console.log("📥 Phản hồi từ server:", data); // Kiểm tra phản hồi từ API
    
            if (!response.ok) {
                throw new Error(data.message || "Không thể thêm bài hát");
            } else {
                this.showNotification("✅ Đã thêm vào playlist!", "success");
            }
    
        } catch (error) {
            console.error("❌ Lỗi khi thêm vào playlist:", error);
            this.showNotification(`❌ Lỗi: ${error.message}`, "error");
        }
    }
    
    
    showNotification(message, type = "success") {
        const notificationSystem = document.getElementById('notificationSystem');
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = `transform translate-x-full opacity-0 transition-all duration-500 flex items-center px-6 py-4 rounded-lg shadow-lg mb-4`;
        
        // Set color and icon based on type
        const colors = {
            success: "bg-green-500 text-white",
            error: "bg-red-500 text-white",
            warning: "bg-yellow-500 text-black",
            info: "bg-blue-500 text-white",
            like: "bg-pink-500 text-white"
        };
        
        const icons = {
            success: `<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>`,
            error: `<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>`,
            warning: `<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>`,
            like: `<svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>`
        };

        notification.className += ` ${colors[type]}`;
        notification.innerHTML = `
            ${icons[type] || icons.info}
            <span class="font-medium">${message}</span>
        `;

        notificationSystem.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Animate out and remove after 5s
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }
    

    async showPlaylistModal() {
        if (!this.currentSongData) {
            this.handleError("⚠️ Không có bài hát nào được chọn!");
            return;
        }
    
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("⚠️ Vui lòng đăng nhập để thêm vào playlist!");
                return;
            }
    
            // Decode JWT token to get user info
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const username = tokenData.username; // Get username from token
    
            // Get user's playlists
            const response = await fetch(`${this.apiUrl}/api/playlists/${username}`, {
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
    
            if (!response.ok) {
                throw new Error("Không thể tải danh sách playlist!");
            }
    
            const data = await response.json();
            this.playlists = Array.isArray(data.data) ? data.data : []; // Ensure this.playlists is an array
    
            // Check if user has any playlists
            if (!this.playlists || this.playlists.length === 0) {
                this.elements.existingPlaylists.innerHTML = `
                    <div class="text-gray-400 text-center py-4">
                        Bạn chưa có playlist nào. Hãy tạo playlist mới!
                    </div>
                `;
            } else {
                // Render user's playlists
                this.renderPlaylistModal();
            }
    
            this.elements.playlistModal.classList.remove("hidden");
            this.elements.playlistModal.classList.add("flex");
    
        } catch (error) {
            console.error("❌ Lỗi tải danh sách playlist:", error);
            this.handleError("Không thể tải danh sách playlist!");
        }
    }

renderPlaylistModal() {
    if (!Array.isArray(this.playlists)) {
        console.error("this.playlists is not an array:", this.playlists);
        this.elements.existingPlaylists.innerHTML = `
            <div class="text-gray-400 text-center py-4">
                Không có playlist nào để hiển thị.
            </div>
        `;
        return;
    }

    this.elements.existingPlaylists.innerHTML = this.playlists.map(playlist => `
        <div class="flex items-center justify-between p-2 hover:bg-gray-700 rounded cursor-pointer playlist-item"
             data-playlist-id="${playlist._id}">
            <div class="flex flex-col">
                <span class="text-white font-medium">${playlist.name}</span>
                <span class="text-gray-400 text-xs">${playlist.songs?.length || 0} bài hát</span>
            </div>
            <button class="text-blue-400 hover:text-blue-500 transition-colors px-3 py-1 rounded-full add-to-playlist-btn"
                    data-playlist-id="${playlist._id}">
                Thêm
            </button>
        </div>
    `).join('');

    // Thêm event listeners cho các phần tử mới tạo
    const playlistItems = this.elements.existingPlaylists.querySelectorAll('.playlist-item');
    playlistItems.forEach(item => {
        item.addEventListener('click', () => {
            const playlistId = item.dataset.playlistId;
            this.addToPlaylist(playlistId);
        });
    });

    const addButtons = this.elements.existingPlaylists.querySelectorAll('.add-to-playlist-btn');
    addButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Ngăn event click truyền lên phần tử cha
            const playlistId = button.dataset.playlistId;
            this.addToPlaylist(playlistId);
        });
    });
}
handleError(message, type = "error") {
    const statusEl = this.elements.playlistModal.querySelector('#playlistStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `text-center text-sm mb-4 ${type === "error" ? "text-red-500" : "text-green-500"}`;
        statusEl.classList.remove("hidden");
        
        setTimeout(() => {
            statusEl.classList.add("hidden");
        }, 3000);
    }
}
setarray(songs) {
    if (!Array.isArray(songs) || songs.length === 0) {
        console.warn("⚠️ Không thể gán playlist, danh sách bài hát rỗng!");
        return;
    }

    this.playlist = [...songs]; // ✅ Lưu danh sách bài hát vào this.playlist
    this.currentIndex = 0; // ✅ Đặt bài hát đầu tiên làm mặc định

    console.log("✅ Playlist đã được gán:", this.playlist);
}

    updateSongItemUI(currentSongId) {
        // Remove 'playing' class from all song items
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('playing');
            item.classList.remove('bg-gray-800');
        });

        // Add 'playing' class to current song
        const currentItem = document.querySelector(`[data-song-id="${currentSongId}"]`);
        if (currentItem) {
            currentItem.classList.add('playing');
            currentItem.classList.add('bg-gray-800');
        }
    }
}
