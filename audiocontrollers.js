const musicPlayer = {
    playlist: [],
    currentIndex: 0,
    audio: new Audio(),

    setPlaylist(songs) {
        this.playlist = songs;
        this.currentIndex = 0;
        this.playSong();
    },

    playSong() {
        if (this.playlist.length === 0) {
            alert("Playlist trống!");
            return;
        }
        this.audio.src = this.playlist[this.currentIndex].file;
        this.audio.play();
    },

    nextSong() {
        if (this.playlist.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.playSong();
    },

    prevSong() {
        if (this.playlist.length === 0) return;
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.playSong();
    },

    togglePlayPause() {
        if (this.audio.paused) {
            this.audio.play();
        } else {
            this.audio.pause();
        }
    },

    toggleRepeat() {
        this.audio.loop = !this.audio.loop;
        alert(this.audio.loop ? "Lặp lại bật" : "Lặp lại tắt");
    }
};
