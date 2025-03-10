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
                throw new Error('Invalid song index or empty playlist');
            }

            // Update current index
            this.currentIndex = index;

            // Get song data
            const song = this.playlist[index];

            // Load and play the track
            await this.loadTrack(song.src, song.title, song.artist);

            // Dispatch event for UI updates
            document.dispatchEvent(new CustomEvent('trackChanged', { 
                detail: { 
                    currentIndex: this.currentIndex,
                    song: song
                }
            }));

            // Update player UI
            this.updatePlayPauseUI();

            return true;
        } catch (error) {
            console.error('Error playing song:', error);
            this.handleError(error);
            return false;
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
        `;
        
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
            likeBtn: document.getElementById("likeBtn")
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
            alert("Please login to like songs");
            return;
        }

        try {
            const likedSongs = JSON.parse(localStorage.getItem('likedSongs') || '[]');
            const songIndex = likedSongs.findIndex(s => s.title === this.currentSongData.title);
            
            if (songIndex === -1) {
                // Add to liked songs
                likedSongs.push({
                    title: this.currentSongData.title,
                    artist: this.currentSongData.artist,
                    filename: this.currentSongData.filename
                });
                this.elements.likeBtn.classList.add("text-red-500");
                this.elements.likeBtn.classList.remove("text-gray-400");
            } else {
                // Remove from liked songs
                likedSongs.splice(songIndex, 1);
                this.elements.likeBtn.classList.remove("text-red-500");
                this.elements.likeBtn.classList.add("text-gray-400");
            }

            localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
            
            // Dispatch event for UI updates
            document.dispatchEvent(new CustomEvent('likeStatusChanged', {
                detail: {
                    title: this.currentSongData.title,
                    isLiked: songIndex === -1
                }
        }));

        } catch (error) {
            console.error("Error toggling like:", error);
            alert("Could not update like status. Please try again.");
        }
    }

    async loadTrack(url, title, artist) {
        try {
            if (this.sound) {
                this.sound.unload();
            }

            const fileType = this.getFileType(url);
            const format = this.getAudioFormat(fileType);

            // Configure Howler for the specific format
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
                    console.log(`Loaded ${format} track:`, title);
                    this.updateNowPlaying(title, artist);
                },
                onloaderror: (id, err) => {
                    console.error(`${format} load error:`, err);
                    this.handleError(`Không thể tải bài hát: ${title}`);
                },
                onplayerror: (id, err) => {
                    console.error(`${format} play error:`, err);
                    this.handleError(`Không thể phát bài hát: ${title}`);
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
                    this.playNext();
                }
            });

            // Start playback
            this.sound.play();
            this.updateVolume(this.volume * 100);

            // Store current song data
            this.currentSongData = { title, artist, filename: url.split('/').pop() };
            
            // Check like status when loading new track
            await this.checkLikeStatus(title);

            return true;
        } catch (error) {
            console.error('Track load error:', error);
            this.handleError(error.message);
            return false;
        }
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

    togglePlay() {
        if (!this.sound) return;
        
        try {
            if (this.sound.playing()) {
                this.sound.pause();
                this.isPlaying = false;
                if (this.progressInterval) {
                    cancelAnimationFrame(this.progressInterval);
                }
            } else {
                this.sound.play();
                this.isPlaying = true;
                this.startProgressUpdate();
            }
            this.updatePlayPauseUI();
        } catch (error) {
            console.error('Error toggling play/pause:', error);
            this.handleError(error);
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

    setPlaylist(songs, startIndex = 0) {
        this.playlist = songs;
        this.currentIndex = startIndex;
    }

    nextTrack() {
        if (this.playlist.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        const nextSong = this.playlist[this.currentIndex];
        this.loadTrack(nextSong.src, nextSong.title, nextSong.artist);
        document.dispatchEvent(new CustomEvent('trackChanged', { 
            detail: { 
                currentIndex: this.currentIndex,
                direction: 'next' // or 'prev' for previous
            }
        }));
        return this.currentIndex;
    }

    prevTrack() {
        if (this.playlist.length === 0) return;
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        const prevSong = this.playlist[this.currentIndex];
        this.loadTrack(prevSong.src, prevSong.title, prevSong.artist);
        document.dispatchEvent(new CustomEvent('trackChanged', { 
            detail: { 
                currentIndex: this.currentIndex,
                direction: 'prev' // or 'prev' for previous
            }
        }));
        return this.currentIndex;
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
        this.playlist = playlist;
        this.currentIndex = 0; // Reset index về bài đầu tiên
    }

    playSongByFilename(filename) {
        const API_URL = "http://localhost:3000"; // Cập nhật nếu dùng ngrok

        fetch(`${API_URL}/song-by-filename/${encodeURIComponent(filename)}`)
            .then(response => response.json())
            .then(song => {
                if (!song || !song.filename) {
                    console.error("❌ Không tìm thấy bài hát!", song);
                    return;
                }

                const songUrl = `${API_URL}/play/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.filename)}`;
                console.log("🎵 Đang phát nhạc:", songUrl);

                this.audio.src = songUrl;
                this.audio.play().catch(error => console.error("❌ Lỗi phát nhạc:", error));
            })
            .catch(error => console.error("❌ Lỗi khi gọi API:", error));
    }

    next() {
        if (this.playlist.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.playSongByFilename(this.playlist[this.currentIndex].filename);
    }

    prev() {
        if (this.playlist.length === 0) return;
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.playSongByFilename(this.playlist[this.currentIndex].filename);
    }

    pause() {
        this.audio.pause();
    }

    resume() {
        this.audio.play();
    }

}
