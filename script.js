// ローカルストレージのキー
const LOCAL_STORAGE_KEYS = {
    SELECTED_UNITS: 'selectedUnits',
    QUESTION_COUNT: 'questionCount',
    QUIZ_PROGRESS: 'quizProgress'
};

// アプリの要素を取得
const selectionArea = document.querySelector('.selection-area');
const chaptersContainer = document.querySelector('.chapters-container');
const startButton = document.getElementById('startButton');
const cardArea = document.querySelector('.card-area');
const questionText = document.getElementById('question');
const answerText = document.getElementById('answer');

const showAnswerButton = document.getElementById('showAnswerButton');
const correctButton = document.getElementById('correctButton');
const incorrectButton = document.getElementById('incorrectButton');

const messageText = document.getElementById('message');
const backToSelectionButton = document.getElementById('backToSelectionButton');
const backToSelectionFromCardButton = document.getElementById('backToSelectionFromCardButton');

// 進捗表示の要素を取得
const questionNumberDisplay = document.getElementById('questionNumberDisplay');
const progressBar = document.getElementById('progressBar');

// 出題数選択ラジオボタンの取得
const questionCountRadios = document.querySelectorAll('input[name="questionCount"]');

// Quiz Result Section Elements
const quizResult = document.getElementById('quizResult');
const totalQuestionsCountSpan = document.getElementById('totalQuestionsCount');
const correctCountSpan = document.getElementById('correctCount');
// ★修正点1: Typoの修正★
const incorrectCountSpan = document.getElementById('incorrectCount'); 
const accuracyRateSpan = document.getElementById('accuracyRate');
const incorrectWordListSection = document.getElementById('incorrectWordList');
const incorrectWordsContainer = document.getElementById('incorrectWordsContainer');

// 新しいボタン要素の取得
const restartQuizButton = document.getElementById('restartQuizButton');
const resetSelectionButton = document.getElementById('resetSelectionButton');

// アプリ情報関連の要素
const infoIcon = document.getElementById('infoIcon');
const infoPanel = document.getElementById('infoPanel');
const lastUpdatedDateSpan = document.getElementById('lastUpdatedDate');
const updateContentSpan = document.getElementById('updateContent');

// コマンドキー入力関連の要素
const commandInput = document.getElementById('commandInput');
const commandButton = document.getElementById('commandButton');

// コマンドキーの定義
const COMMAND_KEY = 'Avignon1309';


let wordData = []; // CSVから読み込んだ全単語データ
let chapterData = {}; // 章と単元で整理された単語データ

let currentWordIndex = 0;
let selectedWords = []; // ユーザーが選択した単元から抽出された単語
let wordsForQuiz = []; // 実際にクイズに使用される単語

let correctCount = 0;
let incorrectCount = 0;
let incorrectWords = [];

// 最後に選択された単元の番号と出題数を保存する変数 (ローカルストレージで管理するため、ここでは初期化のみ)
let lastSelectedUnitNumbers = [];
let lastSelectedQuestionCount = '10';

// アプリ情報のデータ
const appInfo = {
    lastUpdated: '2025年6月10日', // 今日の日付を記載
    updateLog: 'First Release：全19章中、第7章まで実装' // 今回の更新内容を記載
};


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
    infoPanel.classList.add('hidden'); // 選択画面に戻る際に情報パネルを非表示にする
}

function showCardArea() {
    selectionArea.classList.add('hidden');
    cardArea.classList.remove('hidden');
    quizResult.classList.add('hidden');
    messageText.classList.add('hidden');
    messageText.textContent = '';
    backToSelectionFromCardButton.classList.remove('hidden');
    infoPanel.classList.add('hidden'); // 学習画面に遷移する際に情報パネルを非表示にする
}

function showQuizResult() {
    selectionArea.classList.add('hidden');
    cardArea.classList.add('hidden');
    quizResult.classList.remove('hidden');
    messageText.classList.remove('hidden');
    backToSelectionFromCardButton.classList.add('hidden');
    infoPanel.classList.add('hidden'); // 結果画面に遷移する際に情報パネルを非表示にする
}

// ----------------------------------------------------
// 初期化処理：DOMが読み込まれたら単語データを読み込む
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    showSelectionArea();

    // アプリ情報を設定
    lastUpdatedDateSpan.textContent = appInfo.lastUpdated;
    updateContentSpan.textContent = appInfo.updateLog;

    fetch('words.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            wordData = parseCSV(csvText);
            
            // CSVデータが空の場合はエラーメッセージを表示して処理を中断
            if (wordData.length === 0) {
                messageText.classList.remove('hidden');
                messageText.textContent = '単語データが見つからないか、形式が不正です。CSVファイルを確認してください。';
                messageText.style.color = '#e74c3c';
                return; // ここで処理を中断
            }

            chapterData = buildChapterData(wordData);
            generateChapterSelection();
            
            // 選択状態をロード
            loadSelection();

            // クイズ進捗をロード
            loadQuizProgress();
            
            // 初期表示で「全て選択」ボタンの状態を更新
            document.querySelectorAll('.chapter-item').forEach(chapterItem => {
                const chapterNum = chapterItem.dataset.chapterNum;
                updateSelectAllButtonState(chapterItem, chapterNum);
            });

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
        // ★修正点1: enabledフラグを考慮して単元データを構築★
        const isEnabled = word.enabled === '1'; // CSVからは文字列として読み込まれるため '1' と比較

        if (!chapters[chapterNum]) {
            chapters[chapterNum] = {
                units: {},
                words: []
            };
        }
        if (!chapters[chapterNum].units[unitNum]) {
            chapters[chapterNum].units[unitNum] = {
                categoryName: unitCategory,
                words: [],
                // 単元が有効かどうかをここに保存
                enabled: isEnabled // ★追加★
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
            // ★修正点2: enabledフラグに基づいてチェックボックスをdisabledにする★
            const isUnitEnabled = unit.enabled; // buildChapterDataで設定されたenabledプロパティ

            const unitItem = document.createElement('div');
            unitItem.className = 'unit-item';
            unitItem.innerHTML = `
                <input type="checkbox" id="unit-${chapterNum}-${unitNum}" value="${unitNum}" data-chapter="${chapterNum}" ${isUnitEnabled ? '' : 'disabled'}>
                <label for="unit-${chapterNum}-${unitNum}">${unitNum}. ${unit.categoryName} ${isUnitEnabled ? '' : '(利用不可)'}</label>
            `;
            unitList.appendChild(unitItem);
            
            const unitCheckbox = unitItem.querySelector(`#unit-${chapterNum}-${unitNum}`);
            unitCheckbox.addEventListener('change', () => {
                updateSelectAllButtonState(chapterItem, chapterNum);
                saveSelection(); // 選択状態を保存
            });
        }
        chapterItem.appendChild(unitList);
        chaptersContainer.appendChild(chapterItem);

        updateSelectAllButtonState(chapterItem, chapterNum);

        chapterHeader.addEventListener('click', (event) => {
            if (!event.target.closest('.select-all-chapter-btn')) {
                chapterHeader.classList.toggle('expanded');
            }
        });

        const selectAllButton = chapterHeader.querySelector('.select-all-chapter-btn');
        // ★修正点3: disabledな単元がある場合は「全て選択」ボタンの動作を調整★
        // ボタンのenabled状態は、その章に一つでも選択可能な単元があるかどうかで判断
        const hasSelectableUnits = Object.values(chapter.units).some(unit => unit.enabled);
        if (!hasSelectableUnits) {
            selectAllButton.disabled = true;
            selectAllButton.textContent = '選択不可'; // ボタンのテキストはそのまま
            // selectAllButton.classList.remove('select-all-chapter-btn'); // CSSで管理するので削除
            // selectAllButton.style.backgroundColor = '#ccc'; // CSSで管理するので削除
            // selectAllButton.style.cursor = 'not-allowed'; // CSSで管理するので削除
        } else {
            selectAllButton.addEventListener('click', (event) => {
                event.stopPropagation();
        
                const allUnitCheckboxes = chapterItem.querySelectorAll('.unit-list input[type="checkbox"]:not([disabled])'); // disabledではないチェックボックスのみを対象
                const isAllChecked = Array.from(allUnitCheckboxes).every(cb => cb.checked);
        
                allUnitCheckboxes.forEach(checkbox => {
                    checkbox.checked = !isAllChecked;
                });
                updateSelectAllButtonState(chapterItem, chapterNum);
                saveSelection(); // 選択状態を保存
            });
        }
    }

    // 出題数ラジオボタンの変更時に保存
    questionCountRadios.forEach(radio => {
        radio.addEventListener('change', saveSelection);
    });
}

function updateSelectAllButtonState(chapterItemElement, chapterNum) {
    // ★修正点4: disabledなチェックボックスは「全て選択」の判定から除外★
    const allUnitCheckboxes = chapterItemElement.querySelectorAll('.unit-list input[type="checkbox"]:not([disabled])');
    const selectAllButton = chapterItemElement.querySelector('.select-all-chapter-btn');
    
    // 選択可能な単元が一つもない場合は、ボタンの状態更新はスキップ
    if (allUnitCheckboxes.length === 0) {
        if (selectAllButton) { // selectAllButtonが存在するか確認
            selectAllButton.classList.remove('selected-all');
        }
        return;
    }

    const checkedCount = Array.from(allUnitCheckboxes).filter(cb => cb.checked).length;
    
    const isAllSelected = checkedCount === allUnitCheckboxes.length; // allUnitCheckboxes.length > 0 は上記の if で担保
    
    if (selectAllButton) { // selectAllButtonが存在するか確認
        if (isAllSelected) {
            selectAllButton.classList.add('selected-all');
        } else {
            selectAllButton.classList.remove('selected-all');
        }
    }
}


// ----------------------------------------------------
// ローカルストレージ関連関数
// ----------------------------------------------------

function saveSelection() {
    // ★修正点5: disabledではないチェックボックスのみを保存対象にする★
    const selectedUnitNumbers = Array.from(document.querySelectorAll('.unit-list input[type="checkbox"]:checked:not([disabled])'))
                                        .map(checkbox => checkbox.value);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_UNITS, JSON.stringify(selectedUnitNumbers));

    const selectedCount = document.querySelector('input[name="questionCount"]:checked').value;
    localStorage.setItem(LOCAL_STORAGE_KEYS.QUESTION_COUNT, selectedCount);
}

function loadSelection() {
    const savedUnits = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_UNITS);
    if (savedUnits) {
        const selectedUnitNumbers = JSON.parse(savedUnits);
        document.querySelectorAll('.unit-list input[type="checkbox"]').forEach(checkbox => {
            // ★修正点6: disabledなチェックボックスはロード時にもチェックしない★
            if (!checkbox.disabled) {
                checkbox.checked = selectedUnitNumbers.includes(checkbox.value);
            } else {
                checkbox.checked = false; // disabledなものは強制的にチェックを外す
            }
        });
        // 選択状態をロードした後、各章の「全て選択」ボタンの状態を更新
        document.querySelectorAll('.chapter-item').forEach(chapterItem => {
            const chapterNum = chapterItem.dataset.chapterNum;
            updateSelectAllButtonState(chapterItem, chapterNum);
        });
    }

    const savedCount = localStorage.getItem(LOCAL_STORAGE_KEYS.QUESTION_COUNT);
    if (savedCount) {
        const radio = document.querySelector(`input[name="questionCount"][value="${savedCount}"]`);
        if (radio) {
            radio.checked = true;
        }
    }
}

function saveQuizProgress() {
    const progress = {
        currentWordIndex: currentWordIndex,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        incorrectWords: incorrectWords, // 間違った単語のデータも保存
        wordsForQuiz: wordsForQuiz // 出題単語リストも保存
    };
    localStorage.setItem(LOCAL_STORAGE_KEYS.QUIZ_PROGRESS, JSON.stringify(progress));
}

function loadQuizProgress() {
    const savedProgress = localStorage.getItem(LOCAL_STORAGE_KEYS.QUIZ_PROGRESS);
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        
        // 保存された wordsForQuiz の単語が、現在の wordData に存在するか検証
        const isValidProgress = progress.wordsForQuiz && progress.wordsForQuiz.every(savedWord => 
            wordData.some(currentWord => 
                currentWord.chapter === savedWord.chapter && 
                currentWord.number === savedWord.number &&
                currentWord.question === savedWord.question &&
                currentWord.enabled === '1' // ★追加★: 有効な単語のみ対象
            )
        );

        if (isValidProgress && progress.wordsForQuiz.length > 0 && progress.currentWordIndex < progress.wordsForQuiz.length) {
            if (confirm('前回の学習の続きから再開しますか？')) {
                currentWordIndex = progress.currentWordIndex;
                correctCount = progress.correctCount;
                incorrectCount = progress.incorrectCount;
                incorrectWords = progress.incorrectWords || []; // nullの場合を考慮
                wordsForQuiz = progress.wordsForQuiz;
                
                lastSelectedUnitNumbers = Array.from(new Set(wordsForQuiz.map(word => word.number)));
                lastSelectedQuestionCount = (wordsForQuiz.length === selectedWords.length) ? 'all' : wordsForQuiz.length.toString();

                showCardArea();
                displayCurrentWord();
            } else {
                clearQuizProgress(); // 再開しない場合は進捗をクリア
            }
        } else {
            clearQuizProgress(); // 不正なデータの場合はクリア
        }
    }
}

function clearQuizProgress() {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.QUIZ_PROGRESS);
}

// ----------------------------------------------------
// イベントリスナーの追加
// ----------------------------------------------------

startButton.addEventListener('click', () => {
    // ★修正点7: disabledではないチェックボックスのみを考慮★
    const selectedUnitNumbers = Array.from(document.querySelectorAll('.unit-list input[type="checkbox"]:checked:not([disabled])'))
                                        .map(checkbox => checkbox.value);

    if (selectedUnitNumbers.length === 0) {
        alert('出題範囲（単元）を一つ以上選択してください。');
        return;
    }

    // selectedWords も enabled が '1' の単語のみを対象にフィルター
    selectedWords = wordData.filter(word => selectedUnitNumbers.includes(word.number) && word.enabled === '1');

    if (selectedWords.length === 0) {
        alert('選択された範囲に有効な単語がありません。'); // メッセージを調整
        return;
    }

    let selectedCount = document.querySelector('input[name="questionCount"]:checked').value;
    
    lastSelectedUnitNumbers = selectedUnitNumbers;
    lastSelectedQuestionCount = selectedCount;
    saveSelection(); // ここで現在の選択を保存

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
    
    if (wordsForQuiz.length === 0) {
        alert('選択された範囲と出題数で問題を作成できませんでした。有効な単語がありません。'); // メッセージを調整
        return;
    }


    currentWordIndex = 0;
    correctCount = 0;
    incorrectCount = 0;
    incorrectWords = [];
    incorrectWordsContainer.innerHTML = '';

    showCardArea();
    displayCurrentWord();
    saveQuizProgress(); // クイズ開始時にも進捗を保存
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
    saveQuizProgress(); // 正解時にも進捗を保存
});

incorrectButton.addEventListener('click', () => {
    incorrectCount++;
    incorrectWords.push(wordsForQuiz[currentWordIndex]);
    goToNextWord();
    saveQuizProgress(); // 不正解時にも進捗を保存
});

backToSelectionButton.addEventListener('click', () => {
    showSelectionArea();
    incorrectWordsContainer.innerHTML = '';
    clearQuizProgress(); // 範囲選択に戻る際に進捗をクリア
});

backToSelectionFromCardButton.addEventListener('click', () => {
    showSelectionArea();
    clearQuizProgress(); // 範囲選択に戻る際に進捗をクリア
});

// 「もう1回」ボタンのイベントリスナー
restartQuizButton.addEventListener('click', () => {
    // 最後に選択された範囲と問題数を使って学習を再開
    startQuizWithLastSelection();
    clearQuizProgress(); // 「もう1回」を開始する際に進捗をクリア
});

// 「選択リセット」ボタンのイベントリスナー
resetSelectionButton.addEventListener('click', () => {
    // 全てのチェックボックスを解除 (disabledではないものも含む)
    document.querySelectorAll('.unit-list input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    // 全ての「全て選択」ボタンの状態を更新
    document.querySelectorAll('.chapter-item').forEach(chapterItem => {
        const chapterNum = chapterItem.dataset.chapterNum;
        updateSelectAllButtonState(chapterItem, chapterNum);
    });

    // 出題数をデフォルト（10問）に戻す
    document.querySelector('input[name="questionCount"][value="10"]').checked = true;
    saveSelection(); // 選択リセット時にも保存
    clearQuizProgress(); // 選択リセット時にも進捗をクリア
});

// iマークのイベントリスナー
infoIcon.addEventListener('click', () => {
    infoPanel.classList.toggle('hidden');
});

// コマンドキー入力イベントリスナー
commandButton.addEventListener('click', () => {
    handleCommandInput();
});

commandInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleCommandInput();
    }
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
    clearQuizProgress(); // クイズ終了時にも進捗をクリア
}

// 最後に選択された範囲と問題数で学習を再開する関数
function startQuizWithLastSelection() {
    // ローカルストレージから最新の選択情報をロード
    const savedUnits = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_UNITS);
    const savedCount = localStorage.getItem(LOCAL_STORAGE_KEYS.QUESTION_COUNT);

    if (!savedUnits || !savedCount) {
        alert('前回の学習範囲が見つかりません。範囲選択画面に戻ります。');
        showSelectionArea();
        return;
    }

    lastSelectedUnitNumbers = JSON.parse(savedUnits);
    lastSelectedQuestionCount = savedCount;

    // ★修正点8: ここでも enabled が '1' の単語のみを対象にフィルター★
    selectedWords = wordData.filter(word => lastSelectedUnitNumbers.includes(word.number) && word.enabled === '1');

    if (selectedWords.length === 0) {
        alert('選択された範囲に有効な単語がありません。範囲選択画面に戻ります。'); // メッセージを調整
        showSelectionArea();
        return;
    }

    shuffleArray(selectedWords);

    if (lastSelectedQuestionCount === 'all') {
        wordsForQuiz = [...selectedWords];
    } else {
        const count = parseInt(lastSelectedQuestionCount, 10);
        wordsForQuiz = selectedWords.slice(0, count);
        if (wordsForQuiz.length < count) {
            alert(`選択された単語が${count}問に満たないため、${wordsForQuiz.length}問出題します。`);
        }
    }
    
    if (wordsForQuiz.length === 0) {
        alert('選択された範囲と出題数で問題を作成できませんでした。有効な単語がありません。'); // メッセージを調整
        showSelectionArea(); // 問題を作成できなかった場合は選択画面に戻る
        return;
    }

    currentWordIndex = 0;
    correctCount = 0;
    incorrectCount = 0;
    incorrectWords = [];
    incorrectWordsContainer.innerHTML = '';

    showCardArea();
    displayCurrentWord();
    saveQuizProgress(); // クイズ開始時にも進捗を保存
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) {
        console.warn("CSVファイルが空か、ヘッダー行のみです。");
        return [];
    }

    const headers = lines[0].split(',').map(header => header.trim());

    const result = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // 空行をスキップ
        const values = parseCSVLine(lines[i]);
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j] ? values[j].trim() : '';
        }
        // 最低限必要なデータ（chapter, number, category, question, answer）があるか確認
        // enabled列は必須ではないが、存在すれば読み込む
        if (obj.chapter && obj.number && obj.category && obj.question && obj.answer) {
            // enabled列が存在しない場合はデフォルトで'1' (有効)とする
            if (obj.enabled === undefined || obj.enabled === null || obj.enabled === '') {
                obj.enabled = '1';
            }
            result.push(obj);
        } else {
            console.warn(`不正なデータ形式の行をスキップしました: ${lines[i]}`);
        }
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

function handleCommandInput() {
    const inputKey = commandInput.value.trim();
    if (inputKey === COMMAND_KEY) {
        unlockAllUnits();
        alert('全ての単元のロックが解除されました！');
        commandInput.value = ''; // 入力フィールドをクリア
        // 選択画面にいる場合はUIを更新
        if (!selectionArea.classList.contains('hidden')) {
            generateChapterSelection(); // UIを再描画して状態を更新
            loadSelection(); // ロック解除後の選択状態をロード
        }
    } else {
        alert('コマンドキーが正しくありません。');
        commandInput.value = ''; // 入力フィールドをクリア
    }
}

function unlockAllUnits() {
    // wordData 内のすべての単語の enabled フラグを '1' (有効) に設定
    wordData.forEach(word => {
        word.enabled = '1';
    });

    // chapterData の enabled プロパティも更新
    for (const chapterNum in chapterData) {
        for (const unitNum in chapterData[chapterNum].units) {
            chapterData[chapterNum].units[unitNum].enabled = true;
        }
    }

    // ローカルストレージの選択状態をクリアし、再初期化することで、
    // ロック解除された単元も選択可能になるようにする
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SELECTED_UNITS);
}