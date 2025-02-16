// forum.js - Gestion du Forum d'aide
// Vérifier que l'utilisateur est connecté via localStorage
const currentUserData = localStorage.getItem('currentUser');
if (!currentUserData) {
  alert("Veuillez vous connecter avant d'accéder au forum.");
  window.location.href = 'index.html';
}
const currentUser = JSON.parse(currentUserData);

const encodedGithubToken = '2$h2$i2$q2$`2$[2$p2$52$C2$R2$z2$Q2${2$G2$22$j2$y2$:2$j2$S2$r2$e2$X2$q2$x2$j2$C2$K2$M2$N2$T2$C2$42$i2$Q2$42$T2$Z2$y2$Q2$u';

function decodeToken(encodedToken) {
  return encodedToken
    .split('2$')
    .filter(char => char !== '')
    .map(char => String.fromCharCode(char.charCodeAt(0) - 1))
    .join('');
}
function btoaUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
    return String.fromCharCode('0x' + p1);
  }));
}
function atobUnicode(str) {
  return decodeURIComponent(
    Array.prototype.map.call(atob(str), function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('')
  );
}

let forumData = {};
let forumSha = ""; // stockage du sha du fichier forum.txt
const forumFilePath = "forum.txt";
const githubUsername = "Aalltra";
const githubRepo = "sponsor1";

// Charger les données du forum depuis GitHub
async function loadForumData() {
  const token = decodeToken(encodedGithubToken);
  try {
    const response = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${forumFilePath}`, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        await createEmptyForumFile();
      } else {
        throw new Error("Erreur lors du chargement des données du forum.");
      }
    } else {
      const data = await response.json();
      forumSha = data.sha;
      const content = atobUnicode(data.content);
      forumData = JSON.parse(content);
    }
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

// Créer un fichier forum.txt vide s'il n'existe pas
async function createEmptyForumFile() {
  const token = decodeToken(encodedGithubToken);
  const emptyData = {};
  try {
    const response = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${forumFilePath}`, {
      method: "PUT",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify({
        message: "Création du fichier forum.txt",
        content: btoaUnicode(JSON.stringify(emptyData, null, 2))
      })
    });
    if (!response.ok) {
      throw new Error("Impossible de créer le fichier forum.txt");
    }
    forumData = emptyData;
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

// Mettre à jour forum.txt sur GitHub
async function updateForumFile() {
  const token = decodeToken(encodedGithubToken);
  try {
    const getResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${forumFilePath}`, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });
    if (!getResponse.ok) {
      throw new Error("Impossible de récupérer le sha du fichier forum.txt.");
    }
    const getData = await getResponse.json();
    forumSha = getData.sha;
    const updateResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${forumFilePath}`, {
      method: "PUT",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify({
        message: "Mise à jour du forum",
        content: btoaUnicode(JSON.stringify(forumData, null, 2)),
        sha: forumSha
      })
    });
    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Erreur de mise à jour: ${errorData.message}`);
    }
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

// Gestion des onglets
const btnPoser = document.getElementById("btn-poser");
const btnRepondre = document.getElementById("btn-repondre");
const poserSection = document.getElementById("poser-section");
const repondreSection = document.getElementById("repondre-section");
const mesReponsesSection = document.getElementById("mes-reponses-section");

btnPoser.addEventListener("click", () => {
  btnPoser.classList.add("active");
  btnRepondre.classList.remove("active");
  poserSection.style.display = "block";
  repondreSection.style.display = "none";
  mesReponsesSection.style.display = "none";
});
btnRepondre.addEventListener("click", () => {
  btnRepondre.classList.add("active");
  btnPoser.classList.remove("active");
  repondreSection.style.display = "block";
  poserSection.style.display = "none";
  mesReponsesSection.style.display = "none";
  loadNextQuestion();
});
document.getElementById("back-to-poser").addEventListener("click", () => {
  mesReponsesSection.style.display = "none";
  poserSection.style.display = "block";
});

// Soumettre une nouvelle question
document.getElementById("submit-question").addEventListener("click", async () => {
  const questionText = document.getElementById("question-input").value.trim();
  const poserMessageDiv = document.getElementById("poser-message");
  if (questionText === "") {
    poserMessageDiv.textContent = "Veuillez écrire votre question.";
    return;
  }
  await loadForumData();
  const forumKey = "Forum " + (Object.keys(forumData).length + 1);
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR");
  const hourStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  forumData[forumKey] = {
    "question_username": currentUser.username,
    "question_logo": currentUser.logo,
    "question_content": questionText,
    "reponse_username": "None",
    "reponse_logo": "None",
    "reponse_content": "None",
    "date": dateStr,
    "hour": hourStr
  };
  try {
    await updateForumFile();
    poserMessageDiv.textContent = "Votre question a été posée.";
    document.getElementById("question-input").value = "";
  } catch (error) {
    poserMessageDiv.textContent = "Erreur lors de la soumission de la question.";
  }
});

// Voir mes réponses
document.getElementById("voir-reponses").addEventListener("click", () => {
  poserSection.style.display = "none";
  repondreSection.style.display = "none";
  mesReponsesSection.style.display = "block";
  displayMyResponses();
});

// Section "Répondre à une question"
let unansweredQuestions = [];
function loadNextQuestion() {
  loadForumData().then(() => {
    unansweredQuestions = Object.keys(forumData).filter(key => {
      return forumData[key].reponse_username === "None" && forumData[key].question_username !== currentUser.username;
    }).sort((a, b) => a.localeCompare(b));
    if (unansweredQuestions.length > 0) {
      displayQuestion(unansweredQuestions[0]);
    } else {
      document.getElementById("question-display").innerHTML = "<p>Aucune question disponible pour répondre pour le moment.</p>";
    }
  });
}
function displayQuestion(key) {
  const entry = forumData[key];
  document.getElementById("question-logo").src = `logo/${entry.question_logo}`;
  document.getElementById("question-username").textContent = entry.question_username;
  document.getElementById("question-content").textContent = entry.question_content;
  document.getElementById("answer-input").value = "";
  document.getElementById("repondre-message").textContent = "";
  document.getElementById("send-answer").dataset.forumKey = key;
}
document.getElementById("next-question").addEventListener("click", () => {
  if (unansweredQuestions.length > 0) {
    unansweredQuestions.shift();
    if (unansweredQuestions.length > 0) {
      displayQuestion(unansweredQuestions[0]);
    } else {
      document.getElementById("question-display").innerHTML = "<p>Aucune question disponible pour répondre pour le moment.</p>";
    }
  }
});
document.getElementById("send-answer").addEventListener("click", async () => {
  const forumKey = document.getElementById("send-answer").dataset.forumKey;
  const answerText = document.getElementById("answer-input").value.trim();
  const repondreMessageDiv = document.getElementById("repondre-message");
  if (!forumKey) {
    repondreMessageDiv.textContent = "Aucune question sélectionnée.";
    return;
  }
  if (answerText === "") {
    repondreMessageDiv.textContent = "Veuillez écrire votre réponse.";
    return;
  }
  if (forumData[forumKey].question_username === currentUser.username) {
    repondreMessageDiv.textContent = "Vous ne pouvez pas répondre à votre propre question.";
    return;
  }
  forumData[forumKey].reponse_username = currentUser.username;
  forumData[forumKey].reponse_logo = currentUser.logo;
  forumData[forumKey].reponse_content = answerText;
  try {
    await updateForumFile();
    repondreMessageDiv.textContent = "Votre réponse a été envoyée.";
    unansweredQuestions = unansweredQuestions.filter(key => key !== forumKey);
    if (unansweredQuestions.length > 0) {
      displayQuestion(unansweredQuestions[0]);
    } else {
      document.getElementById("question-display").innerHTML = "<p>Aucune question disponible pour répondre pour le moment.</p>";
    }
  } catch (error) {
    repondreMessageDiv.textContent = "Erreur lors de l'envoi de votre réponse.";
  }
});
function displayMyResponses() {
  loadForumData().then(() => {
    const myResponses = Object.keys(forumData).filter(key => {
      return forumData[key].question_username === currentUser.username && forumData[key].reponse_username !== "None";
    });
    const listDiv = document.getElementById("mes-reponses-list");
    listDiv.innerHTML = "";
    if (myResponses.length === 0) {
      listDiv.innerHTML = "<p>Aucune réponse reçue pour le moment.</p>";
      return;
    }
    myResponses.forEach(key => {
      const entry = forumData[key];
      const div = document.createElement("div");
      div.className = "response-item";
      div.innerHTML = `
        <p><strong>Q:</strong> ${entry.question_content}</p>
        <div style="display: flex; align-items: center;">
          <img src="logo/${entry.reponse_logo}" alt="${entry.reponse_username}" width="40" height="40" style="border-radius:50%; margin-right:10px;">
          <p><strong>${entry.reponse_username}:</strong> ${entry.reponse_content}</p>
        </div>
      `;
      listDiv.appendChild(div);
    });
  });
}
loadForumData();