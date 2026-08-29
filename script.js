const images = [
    "./assets/draw1.jpeg",
    "./assets/draw2.jpeg",
    "./assets/draw3.jpeg"
];

const image = document.querySelector("#draws");
const nextButton = document.querySelector("#next");
const previousButton = document.querySelector("#previous");

const casseteImage = document.getElementById("cassete");
const song = document.getElementById("song");
const nowPlayingLabel = document.getElementById("now-playing");

let currentImage = 1;

function showImage(index) {
    currentImage = (index + images.length) % images.length;
    image.src = images[currentImage];
    image.alt = `Artwork ${currentImage + 1} of ${images.length}`;
}

nextButton.addEventListener("click", () => {
    showImage(currentImage + 1);
});

previousButton.addEventListener("click", () => {
    showImage(currentImage - 1);
});

/* ---------- Lofi hip hop via API da Audius ---------- */

const AUDIUS_APP_NAME = "YourComfortPlace";
const AUDIUS_API = "https://api.audius.co/v1";

let lofiPlaylist = [];   // faixas já embaralhadas
let lofiCursor = -1;     // posição atual dentro da playlist embaralhada
let lofiReady = false;   // true depois que a playlist carregou com sucesso
let usingLocalFallback = false; // true se caímos de volta pro rainy.ogg local

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Palavras-chave usadas pra confirmar que a faixa é realmente lofi E hip hop
// (o campo "tags" da Audius é uma string separada por vírgula, ex: "lofi,chill,beats")
const LOFI_KEYWORDS = ["lofi", "lo-fi", "lo fi"];
const HIPHOP_KEYWORDS = ["hiphop", "hip-hop", "hip hop", "boombap", "boom bap", "chillhop", "beats"];
const HIPHOP_GENRE = "Hip-Hop/Rap";

async function fetchTracks(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
    } catch (err) {
        console.warn("Falha ao buscar em", url, err);
        return [];
    }
}

function dedupeById(tracks) {
    const seen = new Set();
    return tracks.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
    });
}

function trackText(track) {
    return [track.genre, track.mood, track.tags, track.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

function looksLofi(track) {
    const text = trackText(track);
    return track.genre === "Lo-Fi" || LOFI_KEYWORDS.some(k => text.includes(k));
}

function looksHipHop(track) {
    const text = trackText(track);
    return track.genre === HIPHOP_GENRE || HIPHOP_KEYWORDS.some(k => text.includes(k));
}

async function loadLofiPlaylist() {
    try {
        // três fontes em paralelo: busca textual + os dois gêneros mais próximos
        const [searchResults, lofiGenre, hipHopGenre] = await Promise.all([
            fetchTracks(`${AUDIUS_API}/tracks/search?query=lofi%20hip%20hop&limit=50&app_name=${AUDIUS_APP_NAME}`),
            fetchTracks(`${AUDIUS_API}/tracks/trending?genre=Lo-Fi&limit=50&app_name=${AUDIUS_APP_NAME}`),
            fetchTracks(`${AUDIUS_API}/tracks/trending?genre=${encodeURIComponent(HIPHOP_GENRE)}&limit=50&app_name=${AUDIUS_APP_NAME}`)
        ]);

        const pool = dedupeById([...searchResults, ...lofiGenre, ...hipHopGenre]);

        // tier 1: precisa parecer lofi E hip hop ao mesmo tempo (filtro mais preciso)
        let tracks = pool.filter(t => looksLofi(t) && looksHipHop(t));

        // tier 2: pool ainda pequeno? relaxa pra "pelo menos parece lofi"
        if (tracks.length < 5) {
            tracks = pool.filter(looksLofi);
        }

        // tier 3: último recurso, usa tudo que veio das 3 buscas sem filtrar
        if (!tracks.length) tracks = pool;

        if (!tracks.length) throw new Error("Nenhuma faixa lofi hip hop encontrada na Audius.");

        lofiPlaylist = shuffle(tracks);
        lofiCursor = -1;
        lofiReady = true;
    } catch (err) {
        console.warn("Não foi possível carregar faixas lofi da Audius, usando áudio local:", err);
        usingLocalFallback = true;
    }
}

function nextLofiTrack() {
    lofiCursor++;
    if (lofiCursor >= lofiPlaylist.length) {
        lofiPlaylist = shuffle(lofiPlaylist); // re-embaralha ao chegar no fim
        lofiCursor = 0;
    }
    return lofiPlaylist[lofiCursor];
}

function playLofiTrack(track) {
    song.src = `${AUDIUS_API}/tracks/${track.id}/stream?app_name=${AUDIUS_APP_NAME}`;
    song.play().catch(e => console.warn("Autoplay bloqueado:", e));

    const artist = track.user ? track.user.name : "";
    nowPlayingLabel.textContent = artist ? `${track.title} — ${artist}` : track.title;
    nowPlayingLabel.classList.add("visible");
}

casseteImage.addEventListener("click", async () => {
    // Primeiro clique: carrega e começa a tocar em shuffle
    if (!lofiReady && !usingLocalFallback) {
        await loadLofiPlaylist();

        if (lofiReady) {
            playLofiTrack(nextLofiTrack());
        } else {
            // fallback: mantém o comportamento original com rainy.ogg
            song.play();
            nowPlayingLabel.textContent = "rainy day (local)";
            nowPlayingLabel.classList.add("visible");
        }

        casseteImage.classList.add("playing");
        return;
    }

    // Cliques seguintes: apenas alterna play/pause da faixa atual
    if (song.paused) {
        song.play();
        casseteImage.classList.add("playing");
    } else {
        song.pause();
        casseteImage.classList.remove("playing");
    }
});

// Ao terminar a faixa, segue automaticamente para a próxima do shuffle
song.addEventListener("ended", () => {
    if (lofiReady && lofiPlaylist.length) {
        playLofiTrack(nextLofiTrack());
    }
    // se estiver no fallback local, o rainy.ogg simplesmente para (loop opcional: song.loop = true)
});

/* ---------- Modal do disclaimer ---------- */

const disclaimerImage = document.getElementById("disclaimer");
const disclaimerModal = document.getElementById("disclaimer-modal");
const modalClose = document.getElementById("modal-close");

function openDisclaimer() {
    disclaimerModal.classList.add("visible");
}

function closeDisclaimer() {
    disclaimerModal.classList.remove("visible");
}

disclaimerImage.addEventListener("click", openDisclaimer);
modalClose.addEventListener("click", closeDisclaimer);

// clicar fora da caixa (no fundo escurecido) também fecha
disclaimerModal.addEventListener("click", (event) => {
    if (event.target === disclaimerModal) closeDisclaimer();
});

// tecla Esc fecha o modal
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDisclaimer();
});