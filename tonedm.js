document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener('beforeunload', function (e) {
        e.preventDefault();
        e.returnValue = '';
    });

    window.onmessage = function (e) {
        if (e.data === 'beforeunload') {
            e.preventDefault();
            e.returnValue = '';
        }
    };

    const textInput = document.getElementById('text-input');
    const fileInput = document.getElementById('file-input');
    const browseButton = document.getElementById('browse-button');
    const summaryPopup = document.getElementById('summary-popup');
    const summaryOutput = document.getElementById('summary-output');
    const closeButton = document.querySelector('.close');
    const toneButtons = document.querySelectorAll('.tone-button');

    browseButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                textInput.value = e.target.result;
            };
            reader.readAsText(file);
        }
    });

    textInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    textInput.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                textInput.value = e.target.result;
            };
            reader.readAsText(file);
        }
    });

    toneButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tone = button.getAttribute('data-tone');
            const text = textInput.value.trim();
            if (text === '') return;

            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = `Processing ${tone}...`;

            try {
                const toneInstruction = `${button.textContent}\n\n`;
                const response = await fetch('https://11pwcqff-3003.inc1.devtunnels.ms/summarize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ text: toneInstruction + text })
                });
                if (!response.ok) {
                    if (response.status === 413) {
                        throw new Error('PayloadTooLargeError');
                    } else {
                        throw new Error(`Network response was not ok, status: ${response.status}`);
                    }
                }

                const data = await response.json();
                let summary = data.summary;

                summary = formatBulletPointsAndBoldText(summary);

                const summaryDiv = document.createElement('div');
                summaryDiv.innerHTML = `
                    <pre class="code-block">${summary}</pre>
                    <button class="copy-button">📋 Copy</button>
                `;

                summaryOutput.innerHTML = '';
                summaryOutput.appendChild(summaryDiv);
                summaryPopup.style.display = 'flex';

                document.querySelectorAll('.copy-button').forEach((copyBtn) => {
                    copyBtn.addEventListener('click', (event) => {
                        const codeBlock = event.target.previousElementSibling;
                        const code = codeBlock.innerText;
                        navigator.clipboard.writeText(code).then(() => {
                            copyBtn.innerText = '✓ Copied!';
                            setTimeout(() => {
                                copyBtn.innerText = '📋 Copy';
                            }, 2000);
                        });
                    });
                });

            } catch (error) {
                console.error('Fetch error:', error);
                if (error.message === 'PayloadTooLargeError') {
                    alert('The text is too large, try making the text smaller.');
                } else {
                    alert('An error occurred while processing your request. Please try again later.');
                }
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    });

    closeButton.addEventListener('click', () => {
        summaryPopup.style.display = 'none';
    });

    function formatBulletPointsAndBoldText(text) {
        let formattedText = text.replace(/^- /gm, '<li>');
        formattedText = formattedText.replace(/(<li>|\d+\.)\s*(\*\*.+?\*\*)/gm, '$1 <b>$2</b>');
        formattedText = formattedText.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
        const tableRegex = /(\|.+\|[\r\n|\n]+\|[-\s|:]+[\r\n|\n]+(?:\|.*\|[\r\n|\n]+)*)/gm;
        formattedText = formattedText.replace(tableRegex, (match) => {
            const rows = match.trim().split('\n').map(row => row.trim().split('|').filter(cell => cell.trim() !== ''));
            let tableHTML = '<table border="1" style="width:100%; border-collapse: collapse;">';
            rows.forEach((cells, index) => {
                tableHTML += '<tr>';
                cells.forEach(cell => {
                    cell = cell.replace(/\*\*(.*?)\*\*/g, '$1');
                    tableHTML += `<td style="border: 1px solid #ddd; padding: 8px;">${cell.trim()}</td>`;
                });
                tableHTML += '</tr>';
            });
            tableHTML += '</table>';
            return tableHTML;
        });

        return formattedText;
    }

    const menuBtn = document.getElementById('menu-btn');
    const menuList = document.getElementById('menu-list');

    menuBtn.addEventListener('click', () => {
        const isOpen = menuList.style.left === '0px';
        menuList.style.left = isOpen ? '-300px' : '0px';
    });
});