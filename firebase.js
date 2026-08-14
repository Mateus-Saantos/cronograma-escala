import { initializeApp } 
from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import { getFirestore, doc, setDoc, getDoc } 
from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAY2Z0RxYm_Xj6esvTcRTJNC-XFqlbuSVg",
    authDomain: "cronograma-escala-6de25.firebaseapp.com",
    projectId: "cronograma-escala-6de25",
    storageBucket: "cronograma-escala-6de25.firebasestorage.app",
    messagingSenderId: "196926870438",
    appId: "1:196926870438:web:006c6c5cf224b26a873567"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.db = db;
window.doc = doc;
window.setDoc = setDoc;
window.getDoc = getDoc;

// Gerar um ID aleatório para o cronograma
function gerarId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Salvar cronograma no Firestore e retornar a URL para compartilhamento
async function salvarCronograma(dados) {
    const id = gerarId();
    await setDoc(doc(db, "cronogramas", id), dados);
    const url = `${location.origin}${location.pathname}?id=${id}`;
    return url; // isso é o que o botão "Compartilhar" copia/exibe
}

// Carregar cronograma do Firestore com base no ID da URL
async function carregarCronograma() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) return null; // sem id na URL = comportamento local normal

  const snap = await getDoc(doc(db, "cronogramas", id));
  return snap.exists() ? snap.data() : null;
}
