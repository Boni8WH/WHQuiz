// 単語データは外部ファイルから読み込むため、ここでは定義しない
let wordData = []; // 初期化
let chapterData = {}; // 章とそれに属する単元の情報を格納するオブジェクト

// アプリの要素を取得
const selectionArea = document.querySelector('.selection-area');
const chaptersContainer = document.querySelector('.chapters-container');
const startButton = document.getElementById('startButton');
const cardArea = document.querySelector('.card-area');
const questionText = document.getElementById('question');
const answerText = document.getElementById('answer');

const showAnswerButton = document.getElementById('showAnswerButton');       // 「答えを見る」ボタン
const correctButton = document.getElementById('correctButton');             // 「正解」ボタン
const incorrectButton = document.getElementById('incorrectButton');         // 「不正解」ボタン

const messageText = document.getElementById('message');
const backToSelectionButton = document.getElementById('backToSelectionButton'); // 結果画面の「範囲選択に戻る」ボタン

// ヘッダーに移動した「範囲選択に戻る」ボタンを正しく取得
const backToSelectionFromCardButton = document.getElementById('backToSelectionFromCardButton');

// 進捗表示の要素を取得
const questionNumberDisplay = document.getElementById('questionNumberDisplay');
const progressBar = document.getElementById('progressBar');

// 出題数選択ラジオボタンの取得
const questionCountRadios = document.querySelectorAll('input[name="questionCount"]');

let currentWordIndex = 0;
let selectedWords = [];
let wordsForQuiz = [];

let correctCount = 0;
let incorrectCount = 0;
let incorrectWords = [];

// Quiz Result Section Elements
const quizResult = document.getElementById('quizResult');
const totalQuestionsCountSpan = document.getElementById('totalQuestionsCount');
const correctCountSpan = document.getElementById('correctCount');
const incorrectCountSpan = document.getElementById('incorrectCount');
const accuracyRateSpan = document.getElementById('accuracyRate');
const incorrectWordListSection = document.getElementById('incorrectWordList');
const incorrectWordsContainer = document.getElementById('incorrectWordsContainer');


// ----------------------------------------------------
// UI表示制御関数
// ----------------------------------------------------
function showSelectionArea() {
    selectionArea.classList.remove('hidden');
    cardArea.classList.add('hidden');
    quizResult.classList.add('hidden');
    messageText.classList.add('hidden');
    messageText.textContent = '';
    startButton.textContent = '学習開始';
    backToSelectionFromCardButton.classList.add('hidden'); 
}

function showCardArea() {
    selectionArea.classList.add('hidden');
    cardArea.classList.remove('hidden');
    quizResult.classList.add('hidden');
    messageText.classList.add('hidden');
    messageText.textContent = '';
    backToSelectionFromCardButton.classList.remove('hidden');
}

function showQuizResult() {
    selectionArea.classList.add('hidden');
    cardArea.classList.add('hidden');
    quizResult.classList.remove('hidden');
    messageText.classList.remove('hidden');
    startButton.textContent = 'もう一度学習する';
    backToSelectionFromCardButton.classList.add('hidden');
}

// ----------------------------------------------------
// 初期化処理：DOMが読み込まれたら単語データを読み込む
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    showSelectionArea();

    fetch('words.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            wordData = parseCSV(csvText);
            chapterData = buildChapterData(wordData);
            generateChapterSelection();
        })
        .catch(error => {
            console.error('単語データの読み込みに失敗しました:', error);
            messageText.classList.remove('hidden');
            messageText.textContent = '単語データの読み込みに失敗しました。';
            messageText.style.color = '#e74c3c';
            showSelectionArea();
        });
});

// ----------------------------------------------------
// UI生成関数
// ----------------------------------------------------

function buildChapterData(data) {
    const chapters = {};
    data.forEach(word => {
        const chapterNum = word.chapter;
        const unitNum = word.number;
        const unitCategory = word.category;

        if (!chapters[chapterNum]) {
            chapters[chapterNum] = {
                units: {},
                words: []
            };
        }
        if (!chapters[chapterNum].units[unitNum]) {
            chapters[chapterNum].units[unitNum] = {
                categoryName: unitCategory,
                words: []
            };
        }
        chapters[chapterNum].units[unitNum].words.push(word);
        chapters[chapterNum].words.push(word);
    });

    const sortedChapters = Object.keys(chapters).sort((a, b) => parseInt(a) - parseInt(b));
    const sortedChapterData = {};
    sortedChapters.forEach(chapterNum => {
        sortedChapterData[chapterNum] = chapters[chapterNum];
        const sortedUnitNumbers = Object.keys(chapters[chapterNum].units).sort((a, b) => parseInt(a) - parseInt(b));
        const sortedUnits = {};
        sortedUnitNumbers.forEach(unitNum => {
            sortedUnits[unitNum] = chapters[chapterNum].units[unitNum];
        });
        sortedChapterData[chapterNum].units = sortedUnits;
    });

    return sortedChapterData;
}


function generateChapterSelection() {
    chaptersContainer.innerHTML = '';

    for (const chapterNum in chapterData) {
        const chapter = chapterData[chapterNum];

        const chapterItem = document.createElement('div');
        chapterItem.className = 'chapter-item';
        chapterItem.dataset.chapterNum = chapterNum;

        const chapterHeader = document.createElement('div');
        chapterHeader.className = 'chapter-header';
        chapterHeader.innerHTML = `
            <span class="chapter-title">第${chapterNum}章</span>
            <div class="chapter-options">
                <button class="select-all-chapter-btn" data-chapter="${chapterNum}">全て選択</button>
                <span class="toggle-icon">▶</span>
            </div>
        `;
        chapterItem.appendChild(chapterHeader);

        const unitList = document.createElement('div');
        unitList.className = 'unit-list';

        for (const unitNum in chapter.units) {
            const unit = chapter.units[unitNum];
            const unitItem = document.createElement('div');
            unitItem.className = 'unit-item';
            unitItem.innerHTML = `
                <input type="checkbox" id="unit-${chapterNum}-${unitNum}" value="${unitNum}" data-chapter="${chapterNum}">
                <label for="unit-${chapterNum}-${unitNum}">${unitNum}. ${unit.categoryName}</label>
            `;
            unitList.appendChild(unitItem);
            
            // 各単元チェックボックスの変更イベントにもリスナーを追加
            const unitCheckbox = unitItem.querySelector(`#unit-${chapterNum}-${unitNum}`);
            unitCheckbox.addEventListener('change', () => {
                updateSelectAllButtonState(chapterItem, chapterNum);
            });
        }
        chapterItem.appendChild(unitList);
        chaptersContainer.appendChild(chapterItem);

        // 各章の初期状態を反映
        updateSelectAllButtonState(chapterItem, chapterNum);

        // イベントリスナーを追加
        chapterHeader.addEventListener('click', (event) => {
            if (!event.target.closest('.select-all-chapter-btn')) {
                chapterHeader.classList.toggle('expanded');
            }
        });

        const selectAllButton = chapterHeader.querySelector('.select-all-chapter-btn');
        selectAllButton.addEventListener('click', (event) => {
            event.stopPropagation();

            const allUnitCheckboxes = chapterItem.querySelectorAll('.unit-list input[type="checkbox"]');
            const isAllChecked = Array.from(allUnitCheckboxes).every(cb => cb.checked);

            allUnitCheckboxes.forEach(checkbox => {
                checkbox.checked = !isAllChecked;
            });
            // ボタンの状態を更新
            updateSelectAllButtonState(chapterItem, chapterNum);
        });
    }
}

// 「全て選択」ボタンの状態を更新する関数
function updateSelectAllButtonState(chapterItemElement, chapterNum) {
    const allUnitCheckboxes = chapterItemElement.querySelectorAll('.unit-list input[type="checkbox"]');
    const selectAllButton = chapterItemElement.querySelector('.select-all-chapter-btn');
    
    // 現在チェックされている単元の数をカウント
    const checkedCount = Array.from(allUnitCheckboxes).filter(cb => cb.checked).length;
    
    // 章の全ての単元がチェックされているか、または一つもチェックされていないか
    // 全て選択された状態: 全てのチェックボックスがチェックされている
    const isAllSelected = checkedCount === allUnitCheckboxes.length && allUnitCheckboxes.length > 0;
    
    if (isAllSelected) {
        selectAllButton.classList.add('selected-all');
    } else {
        selectAllButton.classList.remove('selected-all');
    }
}


// ----------------------------------------------------
// イベントリスナーの追加
// ----------------------------------------------------

startButton.addEventListener('click', () => {
    const selectedUnitNumbers = Array.from(document.querySelectorAll('.unit-list input[type="checkbox"]:checked'))
                                           .map(checkbox => checkbox.value);

    if (selectedUnitNumbers.length === 0) {
        alert('出題範囲（単元）を一つ以上選択してください。');
        return;
    }

    selectedWords = wordData.filter(word => selectedUnitNumbers.includes(word.number));

    if (selectedWords.length === 0) {
        alert('選択された範囲に単語がありません。');
        return;
    }

    let selectedCount = document.querySelector('input[name="questionCount"]:checked').value;
    shuffleArray(selectedWords);

    if (selectedCount === 'all') {
        wordsForQuiz = [...selectedWords];
    } else {
        const count = parseInt(selectedCount, 10);
        wordsForQuiz = selectedWords.slice(0, count);
        if (wordsForQuiz.length < count) {
            alert(`選択された単語が${count}問に満たないため、${wordsForQuiz.length}問出題します。`);
        }
    }

    currentWordIndex = 0;
    correctCount = 0;
    incorrectCount = 0;
    incorrectWords = [];
    incorrectWordsContainer.innerHTML = '';

    showCardArea();
    
    displayCurrentWord();
});

showAnswerButton.addEventListener('click', () => {
    answerText.classList.remove('hidden');
    showAnswerButton.classList.add('hidden');
    correctButton.classList.remove('hidden');
    incorrectButton.classList.remove('hidden');
});

correctButton.addEventListener('click', () => {
    correctCount++;
    goToNextWord();
});

incorrectButton.addEventListener('click', () => {
    incorrectCount++;
    incorrectWords.push(wordsForQuiz[currentWordIndex]);
    goToNextWord();
});

backToSelectionButton.addEventListener('click', () => {
    showSelectionArea();
    incorrectWordsContainer.innerHTML = '';
});

backToSelectionFromCardButton.addEventListener('click', () => {
    showSelectionArea();
});


// ----------------------------------------------------
// ヘルパー関数
// ----------------------------------------------------

function goToNextWord() {
    currentWordIndex++;

    if (currentWordIndex < wordsForQuiz.length) {
        displayCurrentWord();
    } else {
        endQuiz();
    }
}

function displayCurrentWord() {
    const currentWord = wordsForQuiz[currentWordIndex];
    questionText.textContent = currentWord.question;
    answerText.textContent = currentWord.answer;

    answerText.classList.add('hidden');
    showAnswerButton.classList.remove('hidden');
    correctButton.classList.add('hidden');
    incorrectButton.classList.add('hidden');

    const totalQuestions = wordsForQuiz.length;
    const currentQuestionNum = currentWordIndex + 1;
    questionNumberDisplay.textContent = `${currentQuestionNum} / ${totalQuestions} 問`;
    const progressPercentage = (currentQuestionNum / totalQuestions) * 100;
    progressBar.style.width = `${progressPercentage}%`;
}

function endQuiz() {
    showQuizResult();

    const totalQuestions = correctCount + incorrectCount;
    totalQuestionsCountSpan.textContent = totalQuestions;
    correctCountSpan.textContent = correctCount;
    incorrectCountSpan.textContent = incorrectCount;
    const accuracy = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(1) : 0;
    accuracyRateSpan.textContent = `${accuracy}`;

    incorrectWordsContainer.innerHTML = '';
    if (incorrectWords.length > 0) {
        incorrectWordListSection.classList.remove('hidden');
        incorrectWords.forEach(word => {
            const listItem = document.createElement('li');
            
            const questionSpan = document.createElement('span');
            questionSpan.className = 'incorrect-question';
            questionSpan.textContent = word.question;

            const answerContainer = document.createElement('div');
            answerContainer.className = 'incorrect-answer-container';

            const answerSpan = document.createElement('span');
            answerSpan.className = 'incorrect-answer hidden';
            answerSpan.textContent = word.answer;

            const showAnswerBtn = document.createElement('button');
            showAnswerBtn.className = 'show-incorrect-answer-button secondary-button';
            showAnswerBtn.textContent = '答えを見る';

            showAnswerBtn.addEventListener('click', () => {
                answerSpan.classList.remove('hidden');
                showAnswerBtn.classList.add('hidden');
            });

            answerContainer.appendChild(answerSpan);
            answerContainer.appendChild(showAnswerBtn);

            listItem.appendChild(questionSpan);
            listItem.appendChild(answerContainer);
            incorrectWordsContainer.appendChild(listItem);
        });
    } else {
        incorrectWordListSection.classList.add('hidden');
    }

    messageText.textContent = `学習終了！${totalQuestions}問を学習しました。`;
    messageText.style.color = '#27ae60';
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());

    const result = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        const values = parseCSVLine(lines[i]);
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j] ? values[j].trim() : '';
        }
        result.push(obj);
    }
    return result;
}

function parseCSVLine(line) {
    const values = [];
    let inQuote = false;
    let currentVal = '';

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
                currentVal += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            values.push(currentVal);
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    values.push(currentVal);
    return values;
}