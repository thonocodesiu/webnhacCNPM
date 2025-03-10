const showRegister = document.getElementById("showRegister");
        const showLogin = document.getElementById("showLogin");
        const loginBox = document.getElementById("loginBox");
        const registerBox = document.getElementById("registerBox");
        const popup = document.getElementById("popup");
        const closePopup = document.getElementById("closePopup");

        showRegister.addEventListener("click", () => {
            loginBox.classList.add("hidden");
            registerBox.classList.remove("hidden");
        });

        showLogin.addEventListener("click", () => {
            registerBox.classList.add("hidden");
            loginBox.classList.remove("hidden");
        });

        document.getElementById("loginForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const username = document.getElementById("loginUsername").value;
            const password = document.getElementById("loginPassword").value;
            
            if (username === "user" && password === "1234") {
                popup.classList.remove("hidden");
            } else {
                loginBox.classList.add("animate-shake");
                setTimeout(() => loginBox.classList.remove("animate-shake"), 400);
            }
        });

        document.getElementById("registerForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const password = document.getElementById("registerPassword").value;
            const confirmPassword = document.getElementById("confirmPassword").value;
            
            if (password !== confirmPassword) {
                registerBox.classList.add("animate-shake");
                setTimeout(() => registerBox.classList.remove("animate-shake"), 400);
            }
        });

        closePopup.addEventListener("click", () => {
            popup.classList.add("hidden");
        });
   