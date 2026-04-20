// Array Real da Roleta Europeia
const roletaEuropeia = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const targetNumbers = [16, 33, 1, 20, 14, 31, 9, 35, 3, 26, 0, 4, 21, 2, 27, 13, 36, 11, 30, 8, 23, 10];

// --- DEFINIÇÃO DE ZONAS PARA O HEATMAP ---
const zonesDef = {
    tier: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
    orphelins: [1, 20, 14, 31, 9, 17, 34, 6],
    voisins: [22, 18, 29, 7, 28, 19, 4, 21, 2, 25],
    zero: [12, 35, 3, 26, 0, 32, 15]
};
let heatmapActive = false;
// -----------------------------------------------

let selectedUserNum = null;
let displayLimit = 50; 
let lastHistoryStr = "";

let fullClientHistory = []; 
let historyAtReset = []; 

let audioEnabled = false;
let lastFullWins = 0;
let lastFullLosses = 0;
let lastCycleState = 'IDLE';
let isFirstLoad = true;

const audioSignal = new Audio('https://upload.wikimedia.org/wikipedia/commons/1/15/Ping_sound.ogg'); 
const audioWin = new Audio('https://upload.wikimedia.org/wikipedia/commons/b/b5/Cash_register_opening.ogg'); 
const audioLoss = new Audio('https://upload.wikimedia.org/wikipedia/commons/1/15/Buzzer.ogg'); 

// --- FUNÇÕES DO HEATMAP ---
function toggleHeatmap() {
    heatmapActive = !heatmapActive;
    const btn = document.getElementById('btn-heatmap');
    if (heatmapActive) {
        btn.innerHTML = '🔥 Heatmap: ON';
        btn.style.background = '#8B5CF6';
        btn.style.color = '#fff';
    } else {
        btn.innerHTML = '🔥 Heatmap: OFF';
        btn.style.background = 'transparent';
        btn.style.color = '#C4B5FD';
    }
    updateData(); 
}

function applyHeatmap(currentResults) {
    if (!heatmapActive) {
        document.querySelectorAll('.rt-shape').forEach(el => el.style.fillOpacity = "1");
        return;
    }

    let counts = { tier: 0, orphelins: 0, voisins: 0, zero: 0 };
    
    currentResults.forEach(num => {
        if (zonesDef.tier.includes(num)) counts.tier++;
        else if (zonesDef.orphelins.includes(num)) counts.orphelins++;
        else if (zonesDef.voisins.includes(num)) counts.voisins++;
        else if (zonesDef.zero.includes(num)) counts.zero++;
    });

    let maxCount = Math.max(...Object.values(counts));
    if (maxCount === 0) maxCount = 1;

    document.querySelectorAll('.rt-num-group').forEach(group => {
        let num = parseInt(group.dataset.num);
        let zone = "";
        if (zonesDef.tier.includes(num)) zone = "tier";
        else if (zonesDef.orphelins.includes(num)) zone = "orphelins";
        else if (zonesDef.voisins.includes(num)) zone = "voisins";
        else if (zonesDef.zero.includes(num)) zone = "zero";

        let opacity = 0.15 + (0.85 * (counts[zone] / maxCount));
        
        let shape = group.querySelector('.rt-shape');
        if (shape) shape.style.fillOpacity = opacity.toFixed(2);
    });
}

function resetSimulator() {
    historyAtReset = [...fullClientHistory];
    updateData(); 
}

function toggleAudio() {
    const btn = document.getElementById('btn-audio');
    audioEnabled = !audioEnabled;
    
    if (audioEnabled) {
        btn.innerHTML = '🔊 Som Ativado';
        btn.classList.add('active');
        [audioSignal, audioWin, audioLoss].forEach(a => {
            a.muted = true;
            let playPromise = a.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(e => console.log(e));
            }
        });
    } else {
        btn.innerHTML = '🔇 Ativar Som para Iniciar';
        btn.classList.remove('active');
    }
}

function playSound(type) {
    if (!audioEnabled) return; 
    try {
        if (type === 'signal') { audioSignal.currentTime = 0; audioSignal.play(); }
        else if (type === 'win') { audioWin.currentTime = 0; audioWin.play(); }
        else if (type === 'loss') { audioLoss.currentTime = 0; audioLoss.play(); }
    } catch(e) { console.error("Erro", e); }
}

const svgns = "http://www.w3.org/2000/svg";
function getNumColor(n) {
    if (n === 0) return "#059669";
    return redNumbers.includes(n) ? "#E53935" : "#1E1E1E";
}

function createRacetrack() {
    const svg = document.getElementById("racetrack-svg");
    const innerPill = document.createElementNS(svgns, "path");
    innerPill.setAttribute("d", "M 90 45 h 600 A 45 45 0 0 1 690 135 h -600 A 45 45 0 0 1 90 45 Z");
    innerPill.setAttribute("fill", "#114724"); innerPill.setAttribute("stroke", "rgba(255, 255, 255, 0.15)"); innerPill.setAttribute("stroke-width", "2");
    svg.appendChild(innerPill);

    function addText(g, x, y, val) {
        const text = document.createElementNS(svgns, "text");
        text.setAttribute("x", x); text.setAttribute("y", y);
        text.setAttribute("text-anchor", "middle"); text.setAttribute("dominant-baseline", "central");
        text.setAttribute("fill", "#fff"); text.setAttribute("font-size", "17"); text.setAttribute("font-weight", "bold");
        text.textContent = val; g.appendChild(text);
    }

    const topNums = [24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35];
    topNums.forEach((num, i) => {
        const x = 90 + i * 40; const g = document.createElementNS(svgns, "g");
        g.setAttribute("class", "rt-num-group"); g.dataset.num = num;
        const rect = document.createElementNS(svgns, "rect");
        rect.setAttribute("x", x); rect.setAttribute("y", 0); rect.setAttribute("width", 40); rect.setAttribute("height", 45);
        rect.setAttribute("class", "rt-shape"); rect.setAttribute("fill", getNumColor(num));
        rect.setAttribute("stroke", "#fff"); rect.setAttribute("stroke-width", "1.5");
        g.appendChild(rect); addText(g, x + 20, 22.5, num);
        if (targetNumbers.includes(num)) g.classList.add("rt-highlight-yellow");
        svg.appendChild(g);
    });

    const botNums = [30, 11, 36, 13, 27, 6, 34, 17, 25, 2, 21, 4, 19, 15, 32];
    botNums.forEach((num, i) => {
        const x = 90 + i * 40; const g = document.createElementNS(svgns, "g");
        g.setAttribute("class", "rt-num-group"); g.dataset.num = num;
        const rect = document.createElementNS(svgns, "rect");
        rect.setAttribute("x", x); rect.setAttribute("y", 135); rect.setAttribute("width", 40); rect.setAttribute("height", 45);
        rect.setAttribute("class", "rt-shape"); rect.setAttribute("fill", getNumColor(num));
        rect.setAttribute("stroke", "#fff"); rect.setAttribute("stroke-width", "1.5");
        g.appendChild(rect); addText(g, x + 20, 157.5, num);
        if (targetNumbers.includes(num)) g.classList.add("rt-highlight-yellow");
        svg.appendChild(g);
    });

    const leftData = [
        { num: 5, d: "M 90 0 A 90 90 0 0 0 26.36 26.36 L 58.18 58.18 A 45 45 0 0 1 90 45 Z", tx: 64, ty: 28 },
        { num: 10, d: "M 26.36 26.36 A 90 90 0 0 0 0 90 L 45 90 A 45 45 0 0 1 58.18 58.18 Z", tx: 28, ty: 64 },
        { num: 23, d: "M 0 90 A 90 90 0 0 0 26.36 153.64 L 58.18 121.82 A 45 45 0 0 1 45 90 Z", tx: 28, ty: 116 },
        { num: 8, d: "M 26.36 153.64 A 90 90 0 0 0 90 180 L 90 135 A 45 45 0 0 1 58.18 121.82 Z", tx: 64, ty: 152 }
    ];
    leftData.forEach(item => {
        const g = document.createElementNS(svgns, "g"); g.setAttribute("class", "rt-num-group"); g.dataset.num = item.num;
        const path = document.createElementNS(svgns, "path"); path.setAttribute("d", item.d); path.setAttribute("class", "rt-shape");
        path.setAttribute("fill", getNumColor(item.num)); path.setAttribute("stroke", "#fff"); path.setAttribute("stroke-width", "1.5");
        g.appendChild(path); addText(g, item.tx, item.ty, item.num);
        if (targetNumbers.includes(item.num)) g.classList.add("rt-highlight-yellow");
        svg.appendChild(g);
    });

    const rightData = [
        { num: 3, d: "M 690 0 A 90 90 0 0 1 767.94 45 L 728.97 67.5 A 45 45 0 0 0 690 45 Z", tx: 724, ty: 32 },
        { num: 26, d: "M 767.94 45 A 90 90 0 0 1 767.94 135 L 728.97 112.5 A 45 45 0 0 0 728.97 67.5 Z", tx: 758, ty: 90 },
        { num: 0, d: "M 767.94 135 A 90 90 0 0 1 690 180 L 690 135 A 45 45 0 0 0 728.97 112.5 Z", tx: 724, ty: 148 }
    ];
    rightData.forEach(item => {
        const g = document.createElementNS(svgns, "g"); g.setAttribute("class", "rt-num-group"); g.dataset.num = item.num;
        const path = document.createElementNS(svgns, "path"); path.setAttribute("d", item.d); path.setAttribute("class", "rt-shape");
        path.setAttribute("fill", getNumColor(item.num)); path.setAttribute("stroke", "#fff"); path.setAttribute("stroke-width", "1.5");
        g.appendChild(path); addText(g, item.tx, item.ty, item.num);
        if (targetNumbers.includes(item.num)) g.classList.add("rt-highlight-yellow");
        svg.appendChild(g);
    });
    
    function addCenterText(x, y, textStr) {
        const text = document.createElementNS(svgns, "text");
        text.setAttribute("x", x); text.setAttribute("y", y);
        text.setAttribute("text-anchor", "middle"); text.setAttribute("dominant-baseline", "central");
        text.setAttribute("fill", "#F1F5F9"); text.setAttribute("font-size", "14"); text.setAttribute("font-family", "sans-serif");
        text.setAttribute("font-weight", "800"); text.setAttribute("letter-spacing", "1.5");
        text.textContent = textStr; svg.appendChild(text);
    }
    function addLine(x1, y1, x2, y2) {
        const line = document.createElementNS(svgns, "line");
        line.setAttribute("x1", x1); line.setAttribute("y1", y1); line.setAttribute("x2", x2); line.setAttribute("y2", y2);
        line.setAttribute("stroke", "rgba(255, 255, 255, 0.15)"); line.setAttribute("stroke-width", "2"); svg.appendChild(line);
    }
    addLine(250, 45, 290, 135); addLine(410, 45, 410, 135); addLine(610, 45, 610, 135); 
    addCenterText(180, 90, "TIER"); addCenterText(340, 90, "ORPHELINS"); addCenterText(510, 90, "VOISINS"); addCenterText(650, 90, "ZERO");        

    document.querySelectorAll('.rt-num-group').forEach(group => {
        group.addEventListener('click', () => {
            const num = parseInt(group.dataset.num); selectedUserNum = (selectedUserNum === num) ? null : num; updateBlueHighlights();
        });
    });
}

function getColorClass(num) {
    if (num === 0) return 'num-green';
    return redNumbers.includes(num) ? 'num-red' : 'num-black';
}

function updateBlueHighlights() {
    document.querySelectorAll('.number-box').forEach(box => {
        if (parseInt(box.textContent) === selectedUserNum) box.classList.add('highlight-blue'); else box.classList.remove('highlight-blue');
    });
    document.querySelectorAll('.rt-num-group').forEach(group => {
        if (parseInt(group.dataset.num) === selectedUserNum) group.classList.add('rt-highlight-blue'); else group.classList.remove('rt-highlight-blue');
    });
}

function updateRacetrackFocus(lastDrawnNumber) {
    document.querySelectorAll('.rt-num-group').forEach(group => {
        group.classList.remove('rt-last-drawn');
        if (parseInt(group.dataset.num) === lastDrawnNumber) { group.classList.add('rt-last-drawn'); group.parentNode.appendChild(group); }
    });
}

function analyzeCycle(resultsArray, filter) {
    let history = [...resultsArray].reverse();
    let trades = [];
    let state = 'IDLE'; 
    let marks = new Array(resultsArray.length).fill(null);

    for (let i = 0; i < history.length; i++) {
        let currentNum = history[i];
        let isTarget = targetNumbers.includes(currentNum);
        let origIndex = history.length - 1 - i; 

        if (state === 'IDLE') {
            let triggered = false;
            if (filter === 'classic') {
                triggered = isTarget;
            } else if (filter === 'confirm' && i >= 1) {
                let prevTarget = targetNumbers.includes(history[i-1]);
                triggered = prevTarget && isTarget;
            } else if (filter === 'virtual_loss' && i >= 1) {
                let prevTarget = targetNumbers.includes(history[i-1]);
                triggered = !prevTarget && !isTarget;
            } else if (filter === 'extreme_delay' && i >= 4) {
                triggered = true;
                for (let j = 0; j <= 4; j++) {
                    if (targetNumbers.includes(history[i-j])) {
                        triggered = false; 
                        break;
                    }
                }
            } else if (filter === 'surf' && i >= 1) {
                triggered = targetNumbers.includes(history[i-1]);
            }

            if (triggered) {
                state = 'SIGNALED'; 
            }
        } else if (state === 'SIGNALED') {
            if (isTarget) {
                trades.push('win_direto');
                marks[origIndex] = 'win';
                state = 'COOLDOWN'; 
            } else {
                state = 'GALE'; 
            }
        } else if (state === 'GALE') {
            if (isTarget) {
                trades.push('win_g1');
                marks[origIndex] = 'win';
            } else {
                trades.push('loss');
                marks[origIndex] = 'loss';
            }
            state = 'COOLDOWN'; 
        } else if (state === 'COOLDOWN') {
            let triggered = false;
            if (filter === 'classic') {
                triggered = isTarget;
            } else if (filter === 'confirm' && i >= 1) {
                let prevTarget = targetNumbers.includes(history[i-1]);
                triggered = prevTarget && isTarget;
            } else if (filter === 'virtual_loss' && i >= 1) {
                let prevTarget = targetNumbers.includes(history[i-1]);
                triggered = !prevTarget && !isTarget;
            } else if (filter === 'extreme_delay' && i >= 4) {
                triggered = true;
                for (let j = 0; j <= 4; j++) {
                    if (targetNumbers.includes(history[i-j])) {
                        triggered = false; 
                        break;
                    }
                }
            } else if (filter === 'surf' && i >= 1) {
                triggered = targetNumbers.includes(history[i-1]);
            }

            if (!triggered) {
                state = 'IDLE';
            }
        }
    }
    return { trades, state, marks };
}

function updateSecondaryTrackers(currentResults) {
    if (!currentResults || currentResults.length < 15) return;

    const recent = currentResults.slice(0, 15);

    // 1. RASTREADOR DE TERMINAIS
    const counts = {};
    let terminalQuente = null;
    let maxCount = 0;
    
    recent.forEach(n => {
        let t = n % 10;
        counts[t] = (counts[t] || 0) + 1;
        if(counts[t] > maxCount) { 
            maxCount = counts[t]; 
            terminalQuente = t; 
        }
    });

    const termStatus = document.getElementById('tracker-terminais-status');
    const termDesc = document.getElementById('tracker-terminais-desc');
    
    if (maxCount >= 4) {
        termStatus.innerHTML = "🔥 ALTA TENDÊNCIA!";
        termStatus.style.color = "#FCD34D";
        termStatus.style.background = "rgba(252, 211, 77, 0.15)";
        termStatus.style.border = "1px solid #FCD34D";
        termDesc.innerHTML = `O Terminal <strong>${terminalQuente}</strong> apareceu ${maxCount} vezes recentemente.`;
    } else {
        termStatus.innerHTML = "Coletando Dados...";
        termStatus.style.color = "#60A5FA";
        termStatus.style.background = "rgba(59, 130, 246, 0.1)";
        termStatus.style.border = "none";
        termDesc.innerHTML = "Buscando repetição de terminais numéricos.";
    }

    // 2. RASTREADOR DE DÚZIAS
    const countAbsence = (dozenIndex) => {
        let count = 0;
        for (let n of currentResults) {
            if (n === 0) { count++; continue; }
            let d = Math.ceil(n / 12);
            if (d !== dozenIndex) count++;
            else break;
        }
        return count;
    };

    const ausD1 = countAbsence(1);
    const ausD2 = countAbsence(2);
    const ausD3 = countAbsence(3);
    
    let maxAus = Math.max(ausD1, ausD2, ausD3);
    let duziaDorminhoca = ausD1 === maxAus ? 1 : (ausD2 === maxAus ? 2 : 3);

    const duzStatus = document.getElementById('tracker-duzias-status');
    const duzDesc = document.getElementById('tracker-duzias-desc');

    if (maxAus >= 8) {
        duzStatus.innerHTML = "🎯 GATILHO PRONTO!";
        duzStatus.style.color = "#34D399";
        duzStatus.style.background = "rgba(16, 185, 129, 0.2)";
        duzStatus.style.border = "1px solid #10B981";
        duzDesc.innerHTML = `A <strong>${duziaDorminhoca}ª Dúzia</strong> está ausente há ${maxAus} giros.`;
    } else {
        duzStatus.innerHTML = "Monitorando...";
        duzStatus.style.color = "#94A3B8";
        duzStatus.style.background = "rgba(255, 255, 255, 0.05)";
        duzStatus.style.border = "none";
        duzDesc.innerHTML = `Ausência máxima atual: ${maxAus} giros (Dúzia ${duziaDorminhoca}).`;
    }

    // 3. ALTERNÂNCIA DE CORES
    const cores = currentResults.slice(0, 5).map(n => n === 0 ? 'G' : (redNumbers.includes(n) ? 'R' : 'B'));
    let isAlternating = true;
    
    for(let i = 0; i < 3; i++) {
        if(cores[i] === cores[i+1] || cores[i] === 'G' || cores[i+1] === 'G') {
            isAlternating = false; 
            break;
        }
    }

    const corStatus = document.getElementById('tracker-cores-status');
    const corDesc = document.getElementById('tracker-cores-desc');

    if (isAlternating) {
        corStatus.innerHTML = "🔄 PADRÃO IDENTIFICADO!";
        corStatus.style.color = "#C4B5FD";
        corStatus.style.background = "rgba(139, 92, 246, 0.2)";
        corStatus.style.border = "1px solid #8B5CF6";
        corDesc.innerHTML = "Sequência Xadrez ativa (Vermelho/Preto alternando).";
    } else {
        corStatus.innerHTML = "Aguardando Padrão";
        corStatus.style.color = "#94A3B8";
        corStatus.style.background = "rgba(255, 255, 255, 0.05)";
        corStatus.style.border = "none";
        corDesc.innerHTML = "Monitorando surfada de cores (V-P-V-P).";
    }
}

function analyzeMatriz(results) {
    if (!results || results.length < 15) return;

    const getDozen = (n) => n === 0 ? 0 : Math.ceil(n / 12);
    const getCol = (n) => n === 0 ? 0 : (n % 3 === 0 ? 3 : n % 3);

    let metrics = {
        dozens: { 1: { atraso: 0, streak: 0 }, 2: { atraso: 0, streak: 0 }, 3: { atraso: 0, streak: 0 } },
        cols: { 1: { atraso: 0, streak: 0 }, 2: { atraso: 0, streak: 0 }, 3: { atraso: 0, streak: 0 } }
    };

    [1, 2, 3].forEach(grupo => {
        for (let i = 0; i < results.length; i++) {
            if (getDozen(results[i]) === grupo) break;
            if (results[i] !== 0) metrics.dozens[grupo].atraso++;
        }
        for (let i = 0; i < results.length; i++) {
            if (getCol(results[i]) === grupo) break;
            if (results[i] !== 0) metrics.cols[grupo].atraso++;
        }
    });

    let lastDozen = getDozen(results[0]);
    if (lastDozen !== 0) {
        for (let n of results) { if (getDozen(n) === lastDozen) metrics.dozens[lastDozen].streak++; else break; }
    }

    let lastCol = getCol(results[0]);
    if (lastCol !== 0) {
        for (let n of results) { if (getCol(n) === lastCol) metrics.cols[lastCol].streak++; else break; }
    }

    [1, 2, 3].forEach(g => {
        document.getElementById(`dz${g}-status`).innerHTML = `<span style="color: ${metrics.dozens[g].atraso > 5 ? '#EF4444' : '#94A3B8'}">Atraso: ${metrics.dozens[g].atraso}</span> | <span style="color: ${metrics.dozens[g].streak > 2 ? '#34D399' : '#94A3B8'}">Streak: ${metrics.dozens[g].streak}</span>`;
        document.getElementById(`col${g}-status`).innerHTML = `<span style="color: ${metrics.cols[g].atraso > 5 ? '#EF4444' : '#94A3B8'}">Atraso: ${metrics.cols[g].atraso}</span> | <span style="color: ${metrics.cols[g].streak > 2 ? '#34D399' : '#94A3B8'}">Streak: ${metrics.cols[g].streak}</span>`;
    });

    let signalMessage = "Aguardando formatação de padrão nas Dúzias e Colunas...";
    let signalStyle = "background: #1E293B; color: #94A3B8; border: 1px dashed #1E293B;";
    let isSignaled = false;

    if (metrics.dozens[lastDozen]?.streak >= 3 && !isSignaled) {
        let cobrir = [1, 2, 3].filter(d => d !== lastDozen).join(' e ');
        signalMessage = `🔥 SINAL DE EXAUSTÃO: <b>Apostar nas Dúzias ${cobrir}</b> (A ${lastDozen}ª Dúzia repetiu ${metrics.dozens[lastDozen].streak}x)`;
        signalStyle = "background: rgba(16, 185, 129, 0.15); color: #34D399; border: 2px solid #10B981; animation: pulse 1.5s infinite;";
        isSignaled = true;
    }
    if (metrics.cols[lastCol]?.streak >= 3 && !isSignaled) {
        let cobrir = [1, 2, 3].filter(c => c !== lastCol).join(' e ');
        signalMessage = `🔥 SINAL DE EXAUSTÃO: <b>Apostar nas Colunas ${cobrir}</b> (A ${lastCol}ª Coluna repetiu ${metrics.cols[lastCol].streak}x)`;
        signalStyle = "background: rgba(16, 185, 129, 0.15); color: #34D399; border: 2px solid #10B981; animation: pulse 1.5s infinite;";
        isSignaled = true;
    }

    if (!isSignaled) {
        for (let g of [1, 2, 3]) {
            if (metrics.dozens[g].atraso >= 7) {
                signalMessage = `⚠️ SINAL DE ATRASO: <b>Apostar Seco na ${g}ª Dúzia</b> (Ausente há ${metrics.dozens[g].atraso} giros)`;
                signalStyle = "background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 2px solid #F59E0B;";
                isSignaled = true; break;
            }
            if (metrics.cols[g].atraso >= 7) {
                signalMessage = `⚠️ SINAL DE ATRASO: <b>Apostar Seco na ${g}ª Coluna</b> (Ausente há ${metrics.cols[g].atraso} giros)`;
                signalStyle = "background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 2px solid #F59E0B;";
                isSignaled = true; break;
            }
        }
    }

    const alertBox = document.getElementById('matriz-signal-alert');
    alertBox.innerHTML = signalMessage;
    alertBox.style = `margin-top: 15px; padding: 15px; border-radius: 8px; text-align: center; font-size: 1.1rem; ${signalStyle}`;
}

function analyzeZonasCavalos(results) {
    if (!results || results.length < 15) return;

    let zMetrics = {
        tier: { atraso: 0, streak: 0, nome: "Tiers" },
        orphelins: { atraso: 0, streak: 0, nome: "Orphelins" },
        voisins: { atraso: 0, streak: 0, nome: "Voisins" },
        zero: { atraso: 0, streak: 0, nome: "Jogo do Zero" }
    };

    const getZone = (n) => {
        if (zonesDef.tier.includes(n)) return 'tier';
        if (zonesDef.orphelins.includes(n)) return 'orphelins';
        if (zonesDef.voisins.includes(n)) return 'voisins';
        if (zonesDef.zero.includes(n)) return 'zero';
        return null;
    };

    Object.keys(zMetrics).forEach(zone => {
        for (let i = 0; i < results.length; i++) {
            if (getZone(results[i]) === zone) break;
            zMetrics[zone].atraso++;
        }
    });

    let lastZone = getZone(results[0]);
    if (lastZone) {
        for (let n of results) {
            if (getZone(n) === lastZone) zMetrics[lastZone].streak++;
            else break;
        }
    }

    Object.keys(zMetrics).forEach(zone => {
        let el = document.getElementById(`zone-${zone}-status`);
        if(el) {
            el.innerHTML = `<span style="color: ${zMetrics[zone].atraso > 5 ? '#EF4444' : '#94A3B8'}">Atraso: ${zMetrics[zone].atraso}</span> | <span style="color: ${zMetrics[zone].streak >= 2 ? '#34D399' : '#94A3B8'}">Repetições: ${zMetrics[zone].streak}</span>`;
        }
    });

    let zoneSignal = "Aguardando padrão de Zonas (Tiers, Voisins, Orphelins, Zero)...";
    let zoneStyle = "background: #1E293B; color: #94A3B8; border: 1px dashed var(--border-color);";
    let isZoneSignaled = false;

    if (lastZone && zMetrics[lastZone].streak >= 3) {
        zoneSignal = `🔥 PADRÃO DE REPETIÇÃO: <b>Surfar na Zona ${zMetrics[lastZone].nome}</b> (Repetiu ${zMetrics[lastZone].streak}x)`;
        zoneStyle = "background: rgba(236, 72, 153, 0.15); color: #F472B6; border: 2px solid #EC4899; animation: pulse 1.5s infinite;";
        isZoneSignaled = true;
    } else {
        for (let z of Object.keys(zMetrics)) {
            if (zMetrics[z].atraso >= 9) {
                zoneSignal = `⚠️ ALERTA DE ATRASO: <b>Cobrir a Zona ${zMetrics[z].nome}</b> (Ausente há ${zMetrics[z].atraso} giros)`;
                zoneStyle = "background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 2px solid #F59E0B;";
                isZoneSignaled = true;
                break;
            }
        }
    }

    const zoneAlert = document.getElementById('zona-signal-alert');
    if (zoneAlert) {
        zoneAlert.innerHTML = zoneSignal;
        zoneAlert.style = `padding: 12px; border-radius: 8px; text-align: center; font-size: 0.95rem; font-weight: bold; ${zoneStyle}`;
    }

    const getCavalos = (n) => {
        if (n === 0) return [[0,1], [0,2], [0,3]];
        let c = [];
        if (n % 3 !== 1) c.push([n-1, n]);
        if (n % 3 !== 0) c.push([n, n+1]);
        if (n > 3) c.push([n-3, n]);
        if (n < 34) c.push([n, n+3]);
        return c.map(pair => pair.sort((a,b) => a-b).join('-')); 
    };

    let cavaloHits = {};
    let amostraCavalos = results.slice(0, 20);
    
    amostraCavalos.forEach(num => {
        let cavalosDoNumero = getCavalos(num);
        cavalosDoNumero.forEach(cav => {
            cavaloHits[cav] = (cavaloHits[cav] || 0) + 1;
        });
    });

    let hottestCavalo = null;
    let maxCavaloHits = 0;
    
    Object.keys(cavaloHits).forEach(cav => {
        if(cavaloHits[cav] > maxCavaloHits) {
            maxCavaloHits = cavaloHits[cav];
            hottestCavalo = cav;
        }
    });

    let cavaloSignal = "Aguardando repetição de Cavalos (Splits)...";
    let cavaloStyle = "background: #1E293B; color: #94A3B8; border: 1px dashed var(--border-color);";

    if (maxCavaloHits >= 3 && hottestCavalo) {
        let nums = hottestCavalo.split('-').map(Number);
        let col1 = nums[0] === 0 ? 0 : (nums[0] % 3 === 0 ? 3 : nums[0] % 3);
        let dz1 = nums[0] === 0 ? 0 : Math.ceil(nums[0] / 12);
        
        cavaloSignal = `🎯 CAVALO QUENTE: <b>Ficha no Split [${hottestCavalo}]</b> (Bateu ${maxCavaloHits}x nos últimos 20 giros)`;
        cavaloStyle = "background: rgba(16, 185, 129, 0.15); color: #34D399; border: 2px solid #10B981; animation: pulse 1.5s infinite;";
        cavaloSignal += `<br><span style="font-size: 0.8rem; color: #F8FAFC;">Confluência de Dúzia ${dz1} e Coluna ${col1}</span>`;
    }

    const cavaloAlert = document.getElementById('cavalo-signal-alert');
    if (cavaloAlert) {
        cavaloAlert.innerHTML = cavaloSignal;
        cavaloAlert.style = `padding: 12px; border-radius: 8px; text-align: center; font-size: 0.95rem; font-weight: bold; margin-top: 10px; ${cavaloStyle}`;
    }
}

function analyzeCavalosTerminais(results) {
    if (!results || results.length < 10) return;

    const getGroup = (n) => {
        let terminal = n % 10;
        if ([1, 4, 7].includes(terminal)) return '147';
        if ([2, 5, 8].includes(terminal)) return '258';
        if ([0, 3, 6, 9].includes(terminal)) return '0369';
        return null;
    };

    let metrics = {
        '147': { atraso: 0, streak: 0, nome: "Terminais 1-4-7" },
        '258': { atraso: 0, streak: 0, nome: "Terminais 2-5-8" },
        '0369': { atraso: 0, streak: 0, nome: "Terminais 0-3-6-9" }
    };

    Object.keys(metrics).forEach(grp => {
        for (let i = 0; i < results.length; i++) {
            if (getGroup(results[i]) === grp) break;
            metrics[grp].atraso++;
        }
    });

    let lastGroup = getGroup(results[0]);
    if (lastGroup) {
        for (let n of results) {
            if (getGroup(n) === lastGroup) metrics[lastGroup].streak++;
            else break;
        }
    }

    Object.keys(metrics).forEach(grp => {
        let el = document.getElementById(`term-${grp}-status`);
        if(el) {
            let atrasoColor = metrics[grp].atraso >= 5 ? '#EF4444' : '#94A3B8';
            let streakColor = metrics[grp].streak >= 2 ? '#34D399' : '#94A3B8';
            el.innerHTML = `<span style="color: ${atrasoColor}">Atraso: ${metrics[grp].atraso}</span> | <span style="color: ${streakColor}">Repetições: ${metrics[grp].streak}</span>`;
        }
    });

    let signalMessage = "Aguardando repetição de grupos de terminais para validar entrada...";
    let signalStyle = "background: #1E293B; color: #94A3B8; border: 1px dashed var(--border-color);";
    let isSignaled = false;

    if (lastGroup && metrics[lastGroup].streak >= 3) {
        signalMessage = `🔥 TENDÊNCIA FORTE: <b>Entrar nos ${metrics[lastGroup].nome}</b> (Repetiu ${metrics[lastGroup].streak}x seguidas!)`;
        signalStyle = "background: rgba(249, 115, 22, 0.15); color: #FDBA74; border: 2px solid #F97316; animation: pulse 1.5s infinite;";
        isSignaled = true;
    } 
    else {
        for (let grp of Object.keys(metrics)) {
            if (metrics[grp].atraso >= 7) {
                signalMessage = `⚠️ QUEBRA DE ATRASO: <b>Cobrir os ${metrics[grp].nome}</b> (Ausente há ${metrics[grp].atraso} giros)`;
                signalStyle = "background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 2px solid #F59E0B;";
                isSignaled = true;
                break;
            }
        }
    }

    const alertBox = document.getElementById('terminal-signal-alert');
    if (alertBox) {
        alertBox.innerHTML = signalMessage;
        alertBox.style = `padding: 15px; border-radius: 8px; text-align: center; font-size: 1.05rem; font-weight: bold; margin-top: 15px; transition: 0.3s; ${signalStyle}`;
    }
}

function getVizinhos(numero, qtd) {
    if (qtd === 0) return [numero];
    let idx = roletaEuropeia.indexOf(numero);
    let resultado = [];
    for (let i = -qtd; i <= qtd; i++) {
        let targetIdx = (idx + i) % roletaEuropeia.length;
        if (targetIdx < 0) targetIdx += roletaEuropeia.length;
        resultado.push(roletaEuropeia[targetIdx]);
    }
    return resultado;
}

function getCoberturaTerminal(terminal, qtdVizinhos) {
    let numeros = [];
    for (let i = 0; i <= 36; i++) {
        if (i % 10 === terminal) {
            let viz = getVizinhos(i, qtdVizinhos);
            numeros = numeros.concat(viz);
        }
    }
    return [...new Set(numeros)]; 
}

function buildTerminalUI() {
    const container = document.getElementById('terminal-checkboxes-container');
    container.innerHTML = '';
    for(let i=0; i<=9; i++) {
        const label = document.createElement('label');
        label.style = "display: flex; align-items: center; gap: 5px; background: #151F32; padding: 6px 12px; border-radius: 6px; cursor: pointer; border: 1px solid #3B82F6; font-size: 0.9rem; font-weight: bold; color: #F8FAFC; transition: all 0.2s;";
        label.innerHTML = `<input type="checkbox" class="term-check" value="${i}" checked onchange="updateData()" style="cursor: pointer; transform: scale(1.2);"> T${i}`;
        container.appendChild(label);
    }
}

function analyzeTerminaisAvançado(results) {
    if (!results || results.length < 15) return;
    const amostra = results.slice(0, 15); 

    const checkboxes = document.querySelectorAll('.term-check');
    if(checkboxes.length === 0) return; 
    const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value));

    const qtdVizinhos = parseInt(document.getElementById('terminal-vizinhos').value);

    let coberturaPorTerminal = {};
    for(let t=0; t<=9; t++) {
        coberturaPorTerminal[t] = getCoberturaTerminal(t, qtdVizinhos);
    }

    let freq = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
    let positions = {0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};

    amostra.forEach((n, idx) => {
        for(let t=0; t<=9; t++) {
            if (coberturaPorTerminal[t].includes(n)) {
                freq[t]++;
                positions[t].push(idx);
            }
        }
    });

    let maxFreq = -1; let minFreq = 16;
    let tQuente = null; let tFrio = null;

    Object.keys(freq).forEach(t => {
        let tNum = parseInt(t);
        if (freq[tNum] > maxFreq) { maxFreq = freq[tNum]; tQuente = tNum; }
        if (freq[tNum] < minFreq) { minFreq = freq[tNum]; tFrio = tNum; }
    });

    document.getElementById('term-stat-rep').textContent = `T${tQuente} (${maxFreq}x)`;
    document.getElementById('term-stat-qf').innerHTML = `<span style="color:#EF4444">🔥 T${tQuente}</span> / <span style="color:#60A5FA">❄️ T${tFrio}</span>`;

    const pct = Math.min(((maxFreq / 15) * 100), 100).toFixed(0); 
    document.getElementById('term-chart-title').innerHTML = `Estratégia Dominante Atual: <strong>T${tQuente}</strong>`;
    document.getElementById('term-chart-pct').textContent = `${pct}%`;
    document.getElementById('term-chart-bar').style.width = `${pct}%`;

    let tIntercalado = null;
    let melhorScoreIntercalado = -1;

    Object.keys(positions).forEach(t => {
        let posArr = positions[t];
        if (posArr.length >= 2) {
            let colados = 0;
            for(let i=0; i<posArr.length-1; i++) {
                if (Math.abs(posArr[i] - posArr[i+1]) <= 1) colados++;
            }
            if (colados === 0) {
                if (posArr.length > melhorScoreIntercalado) {
                    melhorScoreIntercalado = posArr.length;
                    tIntercalado = t;
                }
            }
        }
    });

    document.getElementById('term-stat-int').textContent = tIntercalado !== null ? `T${tIntercalado}` : `Nenhum`;

    const catalogGrid = document.getElementById('term-catalog-grid');
    catalogGrid.innerHTML = '';
    
    [0,1,2,3,4,5,6,7,8,9].forEach(t => {
        if(!checkedBoxes.includes(t)) return; 

        let hits = freq[t];
        let misses = 15 - hits; 
        
        let div = document.createElement('div');
        div.style = "background: #1E293B; padding: 8px; border-radius: 6px; border: 1px solid #334155; font-size: 0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.3);";
        div.innerHTML = `<strong style="color: #F8FAFC; font-size: 0.95rem;">T${t}</strong><br><div style="margin-top: 4px; background: rgba(0,0,0,0.3); padding: 3px; border-radius: 4px;"><span style="color:#34D399; font-weight:bold;">${hits}W</span> <span style="color:#64748B;">|</span> <span style="color:#EF4444; font-weight:bold;">${misses}L</span></div>`;
        catalogGrid.appendChild(div);
    });

    let signalBox = document.getElementById('adv-terminal-signal');
    let textVizinho = qtdVizinhos === 0 ? "(Seco)" : (qtdVizinhos === 1 ? "(Com 1 Vizinho)" : "(Com 2 Vizinhos)");
    let gatilho = qtdVizinhos === 0 ? 3 : (qtdVizinhos === 1 ? 5 : 7);

    if (checkedBoxes.includes(parseInt(tQuente)) && maxFreq >= gatilho) {
        signalBox.innerHTML = `🎯 SINAL FORTE: <b>Ficha no Terminal ${tQuente} ${textVizinho}</b> (Está quente, bateu ${maxFreq}x nos últimos 15 giros)`;
        signalBox.style = "padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; background: rgba(16, 185, 129, 0.15); color: #34D399; border: 2px solid #10B981; animation: pulse 1.5s infinite; font-size: 1.05rem;";
    
    } else if (tIntercalado !== null && checkedBoxes.includes(parseInt(tIntercalado))) {
        signalBox.innerHTML = `🌊 SINAL DE SURF: <b>Ficha no Terminal ${tIntercalado} ${textVizinho}</b> (Padrão intercalado detectado na cobertura)`;
        signalBox.style = "padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; background: rgba(59, 130, 246, 0.15); color: #60A5FA; border: 2px solid #3B82F6; font-size: 1.05rem;";
    
    } else {
        signalBox.innerHTML = `⏳ Aguardando consolidação de padrão para a cobertura selecionada...`;
        signalBox.style = "padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; background: #1E293B; color: #94A3B8; border: 1px dashed var(--border-color); font-size: 1.05rem;";
    }
}

function processarRedeNeuralMeta(results, fullHistory) {
    if (!fullHistory || fullHistory.length < 20) return;

    const history500 = fullHistory.slice(0, 500);
    const lastDrawn = history500[0];
    const prevDrawn = history500[1];

    let confianca = 0;
    let log1 = "Sem correlação forte de zonas no momento.";
    let log2 = "Dúzias e Colunas não apresentam cruzamento seguro.";
    let decisao = "Aguardando confluência máxima da rede...";
    let estiloDecisao = "background: rgba(255,255,255,0.05); color: #64748B; border: 1px dashed #475569;";

    const alertTerminais = document.getElementById('terminal-signal-alert')?.innerText || "";
    const alertMatriz = document.getElementById('matriz-signal-alert')?.innerText || "";
    const alertZonas = document.getElementById('zona-signal-alert')?.innerText || "";
    const alertCavalos = document.getElementById('cavalo-signal-alert')?.innerText || "";
    const alertTermAvancado = document.getElementById('adv-terminal-signal')?.innerText || "";

    let pulls = {};     
    let seqPulls = {};  
    
    for (let i = 1; i < history500.length - 1; i++) {
        if (history500[i] === lastDrawn) {
            let nextNum = history500[i - 1]; 
            pulls[nextNum] = (pulls[nextNum] || 0) + 1;
            
            if (i + 1 < history500.length && history500[i + 1] === prevDrawn) {
                seqPulls[nextNum] = (seqPulls[nextNum] || 0) + 1;
            }
        }
    }

    let topPullNum = null;
    let topPullCount = 0;
    Object.keys(pulls).forEach(n => {
        if(pulls[n] > topPullCount) { topPullCount = pulls[n]; topPullNum = n; }
    });

    let colCounts = {1: 0, 2: 0, 3: 0};
    history500.slice(0, 100).forEach(n => {
        if(n !== 0) colCounts[(n%3===0)?3:(n%3)]++;
    });
    let hotCol = Object.keys(colCounts).reduce((a,b) => colCounts[a] > colCounts[b] ? a : b);

    let log3 = `Coluna Dominante: Col. ${hotCol} (${colCounts[hotCol]}x nos ult. 100).<br>`;
    if (topPullNum !== null && topPullCount > 1) {
        log3 += `Estatística: O <b>${lastDrawn}</b> puxou o <b>${topPullNum}</b> (${topPullCount}x) na amostra histórica.`;
    } else {
        log3 += `Analisando fluxo e ressonância da Racetrack...`;
    }

    let scores = {};
    for(let i=0; i<=36; i++) scores[i] = 0;

    history500.slice(0, 50).forEach(n => scores[n] += 1);
    Object.keys(pulls).forEach(n => scores[n] += pulls[n] * 5); 
    Object.keys(seqPulls).forEach(n => scores[n] += seqPulls[n] * 15); 
    
    for(let i=1; i<=36; i++) {
        if (((i%3===0)?3:(i%3)) == hotCol) scores[i] += 5;
    }

    let pesosAtivos = 0;

    for(let i=0; i<=36; i++) {
        let t = i % 10;
        if(alertTerminais.includes("1-4-7") && [1,4,7].includes(t)) scores[i] += 10;
        if(alertTerminais.includes("2-5-8") && [2,5,8].includes(t)) scores[i] += 10;
        if(alertTerminais.includes("0-3-6-9") && [0,3,6,9].includes(t)) scores[i] += 10;
        
        if(alertZonas.includes("Voisins") && zonesDef.voisins.includes(i)) scores[i] += 12;
        if(alertZonas.includes("Tiers") && zonesDef.tier.includes(i)) scores[i] += 12;
        if(alertZonas.includes("Orphelins") && zonesDef.orphelins.includes(i)) scores[i] += 12;
        if(alertZonas.includes("Zero") && zonesDef.zero.includes(i)) scores[i] += 12;
    }

    if (alertTerminais.includes("SINAL FORTE") || alertTerminais.includes("TENDÊNCIA FORTE") || alertTermAvancado.includes("SINAL FORTE")) {
        pesosAtivos += 30;
        log1 = "✔️ Terminal dominante ou grupo validado pela rede.";
    } else if (alertTerminais.includes("QUEBRA DE ATRASO")) {
        pesosAtivos += 15;
    }
    if (alertZonas.includes("PADRÃO DE REPETIÇÃO")) {
        pesosAtivos += 25;
        log1 += " Ressonância detectada na Racetrack.";
    }
    if (alertCavalos.includes("CAVALO QUENTE")) {
        pesosAtivos += 20;
    }
    if (alertMatriz.includes("SINAL DE EXAUSTÃO")) {
        pesosAtivos += 25;
        log2 = "✔️ Exaustão matemática (Col/Dz) detectada.";
    } else if (alertMatriz.includes("SINAL DE ATRASO")) {
        pesosAtivos += 15;
        log2 = "✔️ Atraso (Col/Dz) identificado, iniciando curva.";
    }

    confianca = Math.min(pesosAtivos + (topPullCount * 2), 100);

    let sortedScores = Object.keys(scores)
                        .map(n => ({num: parseInt(n), score: scores[n]}))
                        .sort((a,b) => b.score - a.score);
    
    let top4 = sortedScores.slice(0, 4);

    const containerTop4 = document.getElementById('ai-top-4-container');
    containerTop4.innerHTML = '';
    
    top4.forEach(item => {
        let n = item.num;
        let colorClass = getColorClass(n);
        
        let box = document.createElement('div');
        box.style = "display: flex; flex-direction: column; align-items: center; gap: 8px;";
        
        let circle = document.createElement('div');
        circle.className = `number-box ${colorClass}`;
        circle.style = "width: 65px; height: 65px; font-size: 1.6rem; font-weight: 900; border: 2px solid rgba(255,255,255,0.5); box-shadow: 0 0 15px rgba(6, 182, 212, 0.4); border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white;";
        circle.textContent = n;
        
        let prob = document.createElement('div');
        prob.style = "font-size: 0.8rem; color: #34D399; font-weight: bold; background: rgba(16,185,129,0.1); padding: 3px 10px; border-radius: 12px; border: 1px solid #10B981;";
        let matchPct = Math.min(99, 45 + (item.score * 1.2)).toFixed(1);
        prob.textContent = `${matchPct}% Match`;
        
        box.appendChild(circle);
        box.appendChild(prob);
        containerTop4.appendChild(box);
    });

    if (confianca >= 75) {
        decisao = "🔥 ENTRADA SNIPER AUTORIZADA PELA IA (MÁXIMA CONFLUÊNCIA)";
        estiloDecisao = "background: rgba(16, 185, 129, 0.2); color: #34D399; border: 2px solid #10B981; animation: pulse 1.5s infinite; text-shadow: 0 0 10px rgba(52, 211, 153, 0.5);";
    } else if (confianca >= 50) {
        decisao = "⚠️ ATENÇÃO: Confluência Parcial. Foco nos Números-Chave.";
        estiloDecisao = "background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 2px solid #F59E0B;";
    } else {
        decisao = "⏳ Risco Elevado. Múltiplos falsos rompimentos. Operar leve ou aguardar.";
        estiloDecisao = "background: rgba(239, 68, 68, 0.15); color: #F87171; border: 2px solid #EF4444;";
    }

    document.getElementById('ai-log-1').innerHTML = log1;
    document.getElementById('ai-log-2').innerHTML = log2;
    document.getElementById('ai-log-3').innerHTML = log3;
    document.getElementById('ai-final-decision').innerHTML = decisao;
    document.getElementById('ai-final-decision').style = `margin-top: 5px; padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 1.1rem; transition: all 0.3s; ${estiloDecisao}`;
    
    const ringColor = confianca >= 75 ? '#10B981' : (confianca >= 50 ? '#F59E0B' : '#EF4444');
    document.getElementById('ai-confidence-ring').style.background = `conic-gradient(${ringColor} ${confianca}%, #1E293B ${confianca}%)`;
    document.getElementById('ai-score-pct').textContent = `${confianca}%`;
    document.getElementById('ai-score-pct').style.color = ringColor;
}

const formatBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

async function updateData() {
    const bancaInput = document.getElementById('input-banca');
    const fichaInput = document.getElementById('input-ficha');
    const multInput = document.getElementById('input-mult');
    
    const bancaInicial = parseFloat(bancaInput.value) || 0;
    const valorFicha = parseFloat(fichaInput.value) || 0;
    const recoveryMultiplier = parseFloat(multInput.value) || 2.0;
    const entryFilter = document.getElementById('entry-filter').value;

    try {
        // --- AQUI ESTÁ A GRANDE MUDANÇA ---
        // Busca os dados diretamente da API externa, sem precisar do PHP
        const response = await fetch('https://www.iamonstro.com.br/apicurso/roleta.php');
        
        // Pega a resposta em formato de texto bruto
        let text = await response.text();
        
        // Corrige o JSON malformado (substituindo a chave do array)
        text = text.replace('{"results"[', '{"results":[');
        
        // Converte o texto corrigido de volta para um objeto JSON real
        const data = JSON.parse(text);

        if (!data || !data.results) return;

        const results = data.results.map(Number);
        // ------------------------------------
        
        if (fullClientHistory.length === 0) {
            fullClientHistory = [...results];
            historyAtReset = [...results];
        } else {
            let matchIndex = -1;
            for (let i = 0; i < results.length; i++) {
                if (results[i] === fullClientHistory[0]) {
                    let match = true;
                    for (let j = 1; j < 3 && i + j < results.length && j < fullClientHistory.length; j++) {
                        if (results[i+j] !== fullClientHistory[j]) { match = false; break; }
                    }
                    if (match) { matchIndex = i; break; }
                }
            }
            if (matchIndex > 0) {
                const newNumbers = results.slice(0, matchIndex);
                fullClientHistory = newNumbers.concat(fullClientHistory);
            } else if (matchIndex === -1) {
                fullClientHistory = [...results]; 
            }
        }

        const currentResults = results.slice(0, displayLimit);
        const currentStr = currentResults.join('-');

        updateSecondaryTrackers(currentResults);
        analyzeMatriz(currentResults);
        analyzeZonasCavalos(currentResults);
        analyzeCavalosTerminais(currentResults);
        analyzeTerminaisAvançado(currentResults);
        processarRedeNeuralMeta(currentResults, fullClientHistory);

        const fullCycle = analyzeCycle(fullClientHistory, entryFilter);
        const resetCycle = analyzeCycle(historyAtReset, entryFilter);
        const sessionTrades = fullCycle.trades.slice(resetCycle.trades.length); 

        const displayCycle = analyzeCycle(currentResults, entryFilter);

        let saldoSessao = 0;
        let currentDebt = 0;
        let activeMultiplier = 1;

        let sessionWinsDireto = 0;
        let sessionWinsGale = 0;
        let sessionLosses = 0;

        sessionTrades.forEach(trade => {
            let stake = valorFicha * activeMultiplier;
            
            if (trade === 'win_direto') {
                let profit = 14 * stake; 
                saldoSessao += profit;
                currentDebt -= profit;
                sessionWinsDireto++;
            } else if (trade === 'win_g1') {
                let profit = 6 * stake; 
                saldoSessao += profit;
                currentDebt -= profit;
                sessionWinsGale++;
            } else if (trade === 'loss') {
                let loss = 66 * stake; 
                saldoSessao -= loss;
                currentDebt += loss;
                sessionLosses++;
            }

            if (currentDebt <= 0) {
                currentDebt = 0;
                activeMultiplier = 1; 
            } else {
                activeMultiplier = recoveryMultiplier; 
            }
        });

        let currentStake = valorFicha * activeMultiplier;
        let valorEmJogo = 0;
        let prejuizoParcial = 0;

        if (displayCycle.state === 'SIGNALED') {
            valorEmJogo = 22 * currentStake; 
        } else if (displayCycle.state === 'GALE') {
            prejuizoParcial = 22 * currentStake; 
            valorEmJogo = 44 * currentStake; 
        }

        const saldoAtual = bancaInicial + saldoSessao - prejuizoParcial - valorEmJogo;
        const lucroRealSessao = saldoSessao - prejuizoParcial - valorEmJogo;

        document.getElementById('saldo-atual').textContent = formatBRL.format(saldoAtual);
        document.getElementById('saldo-atual').style.color = saldoAtual >= bancaInicial ? '#34D399' : '#F87171';

        const prefix = lucroRealSessao > 0 ? '+' : '';
        document.getElementById('saldo-lucro').textContent = `Lucro/Prejuízo: ${prefix}${formatBRL.format(lucroRealSessao)}`;
        document.getElementById('saldo-lucro').style.color = lucroRealSessao > 0 ? '#34D399' : (lucroRealSessao < 0 ? '#F87171' : '#94A3B8');

        const saldoMesaEl = document.getElementById('saldo-mesa');
        if (valorEmJogo > 0) {
            saldoMesaEl.textContent = `Em Jogo (Na Mesa): ${formatBRL.format(valorEmJogo)}`;
            saldoMesaEl.style.display = 'block';
        } else {
            saldoMesaEl.style.display = 'none';
        }

        const badgeEl = document.getElementById('recovery-status-badge');
        const debtEl = document.getElementById('recovery-debt');
        
        if (currentDebt > 0) {
            badgeEl.className = "recovery-banner";
            badgeEl.innerHTML = `🔴 RECUPERAÇÃO ATIVA (Use Ficha de ${formatBRL.format(valorFicha * activeMultiplier)})`;
            debtEl.textContent = formatBRL.format(currentDebt);
            debtEl.style.color = "#F87171";
        } else {
            badgeEl.className = "normal-banner";
            badgeEl.innerHTML = `✅ MODO NORMAL (Use Ficha de ${formatBRL.format(valorFicha)})`;
            debtEl.textContent = "R$ 0,00";
            debtEl.style.color = "#94A3B8";
        }

        if (currentStr !== lastHistoryStr || heatmapActive) { 
            lastHistoryStr = currentStr;
            const lastDrawnNumber = currentResults[0];

            const grid = document.getElementById('history-grid');
            grid.innerHTML = '';
            currentResults.forEach((num, index) => {
                const box = document.createElement('div');
                box.className = `number-box ${getColorClass(num)}`; box.textContent = num;
                
                if (targetNumbers.includes(num)) box.classList.add('highlight-yellow');
                if (num === selectedUserNum) box.classList.add('highlight-blue');
                box.onclick = () => { selectedUserNum = (selectedUserNum === num) ? null : num; updateBlueHighlights(); };
                
                if (displayCycle.marks[index]) {
                    const badge = document.createElement('div');
                    badge.className = `result-badge ${displayCycle.marks[index] === 'win' ? 'badge-win' : 'badge-loss'}`;
                    badge.innerHTML = displayCycle.marks[index] === 'win' ? '✔' : '✖';
                    box.appendChild(badge);
                }

                grid.appendChild(box);
            });

            updateRacetrackFocus(lastDrawnNumber);
            applyHeatmap(currentResults);

            const monitor = document.getElementById('monitor-message');
            if (displayCycle.state === 'SIGNALED') {
                monitor.innerHTML = `🔥 ENTRADA AUTORIZADA! (1ª Entrada)<div class="rule-subtext">Valor Sugerido: ${formatBRL.format(valorFicha * activeMultiplier)}</div>`;
                monitor.className = "monitor-alert alert-action";
            } else if (displayCycle.state === 'GALE') {
                monitor.innerHTML = `⚠️ ATENÇÃO: APLICAR GALE 1!<div class="rule-subtext">Proteja a entrada cobrindo a mesma zona alvo.</div>`;
                monitor.className = "monitor-alert alert-action";
            } else if (displayCycle.state === 'COOLDOWN') {
                monitor.innerHTML = `🧊 RESFRIAMENTO DA ESTRATÉGIA<div class="rule-subtext">Aguardando a roleta quebrar o padrão atual para iniciar novo ciclo. NÃO ENTRE!</div>`;
                monitor.className = "monitor-alert alert-cooldown";
            } else {
                monitor.innerHTML = `🔎 ANALISANDO PADRÕES...<div class="rule-subtext">Aguardando gatilho do filtro selecionado para autorizar entrada.</div>`;
                monitor.className = "monitor-alert alert-waiting";
            }
        }

        const visWinsDireto = displayCycle.trades.filter(t => t === 'win_direto').length;
        const visWinsGale = displayCycle.trades.filter(t => t === 'win_g1').length;
        const visLosses = displayCycle.trades.filter(t => t === 'loss').length;
        
        const totalEntradasVisuais = visWinsDireto + visWinsGale + visLosses;
        let assertividade = "0.0";
        if (totalEntradasVisuais > 0) assertividade = (((visWinsDireto + visWinsGale) / totalEntradasVisuais) * 100).toFixed(1);

        document.getElementById('stat-entradas').textContent = totalEntradasVisuais;
        document.getElementById('stat-win-direto').textContent = visWinsDireto;
        document.getElementById('stat-win-g1').textContent = visWinsGale;
        document.getElementById('stat-loss').textContent = visLosses;
        document.getElementById('stat-assertividade').textContent = assertividade + '%';
        document.getElementById('panel-win-total').textContent = visWinsDireto + visWinsGale;
        document.getElementById('panel-loss-total').textContent = visLosses;

        if (!isFirstLoad && audioEnabled) {
            let audioTocado = false;
            const absoluteWins = fullCycle.trades.filter(t => t.includes('win')).length;
            const absoluteLoss = fullCycle.trades.filter(t => t === 'loss').length;
            
            if (absoluteWins > lastFullWins) { playSound('win'); audioTocado = true; } 
            else if (absoluteLoss > lastFullLosses) { playSound('loss'); audioTocado = true; }

            if ((displayCycle.state === 'SIGNALED' || displayCycle.state === 'GALE') && displayCycle.state !== lastCycleState) {
                if (audioTocado) setTimeout(() => playSound('signal'), 1500);
                else playSound('signal'); 
            }
            
            lastFullWins = absoluteWins;
            lastFullLosses = absoluteLoss;
        }
        
        if(isFirstLoad) {
            lastFullWins = fullCycle.trades.filter(t => t.includes('win')).length;
            lastFullLosses = fullCycle.trades.filter(t => t === 'loss').length;
            isFirstLoad = false;
        }
        lastCycleState = displayCycle.state;

    } catch (e) { 
        console.error("Erro na atualização", e); 
    } finally {
        setTimeout(updateData, 2000);
    }
}

document.getElementById('entry-filter').onchange = () => { lastHistoryStr = ""; updateData(); };
document.getElementById('history-limit').onchange = (e) => { displayLimit = parseInt(e.target.value); lastHistoryStr = ""; updateData(); };

function exportSessionData() {
    if (fullClientHistory.length === 0) { alert("Não há dados suficientes para exportar."); return; }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Giro_Chronologico,Numero_Sorteado,Cor,Pertence_Aos_Alvos\n";
    let historyChronological = [...fullClientHistory].reverse();
    historyChronological.forEach((num, index) => {
        let cor = num === 0 ? "Verde" : (redNumbers.includes(num) ? "Vermelho" : "Preto");
        let isAlvo = targetNumbers.includes(num) ? "Sim" : "Nao";
        csvContent += `${index + 1},${num},${cor},${isAlvo}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
    link.setAttribute("download", `sessao_sniper_${timestamp}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

buildTerminalUI(); 
createRacetrack();
updateData();