document.addEventListener("DOMContentLoaded", () => {
    // Prevent accidental page navigation
    window.addEventListener('beforeunload', function (e) {
        e.preventDefault();
        e.returnValue = ''; // Standard way to show browser's default warning
    });

    // Handle cross-window beforeunload messages
    window.onmessage = function (e) {
        if (e.data === 'beforeunload') {
            e.preventDefault();
            e.returnValue = '';
        }
    };

    // Select DOM elements
    const textInput = document.getElementById('text-input');
    const fileInput = document.getElementById('file-input');
    const browseButton = document.getElementById('browse-button');
    const summaryPopup = document.getElementById('summary-popup');
    const summaryOutput = document.getElementById('summary-output');
    const closeButton = document.querySelector('.close');
    const toneButtons = document.querySelectorAll('.tone-button');
    const menuBtn = document.getElementById('menu-btn');
    const menuList = document.getElementById('menu-list');

    // File browsing functionality
    browseButton.addEventListener('click', () => {
        fileInput.click(); // Trigger hidden file input
    });

    // Handle file selection
    fileInput.addEventListener('change', handleFileUpload);

    // Handle file drag and drop
    textInput.addEventListener('dragover', preventDefaultHandler);
    textInput.addEventListener('drop', handleFileUpload);

    // Menu toggle functionality
    menuBtn.addEventListener('click', () => {
        const isOpen = menuList.style.left === '0px';
        menuList.style.left = isOpen ? '-990px' : '0px';
    });

    // Tone processing buttons
    toneButtons.forEach(button => {
        button.addEventListener('click', async () => processTone(button, textInput));
    });

    // Close summary popup
    closeButton.addEventListener('click', () => {
        summaryPopup.style.display = 'none';
    });

    // Prevent default drag and drop behavior
    function preventDefaultHandler(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Handle file upload from browse or drag-and-drop
    function handleFileUpload(e) {
        e.preventDefault();
        e.stopPropagation();

        // Get file from either file input or drag-and-drop event
        const file = e.type === 'drop' ? e.dataTransfer.files[0] : fileInput.files[0];
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                textInput.value = event.target.result;
            };
            reader.readAsText(file);
        }
    }

    // Process tone-specific summarization
    async function processTone(button, textInput) {
        const tone = button.getAttribute('data-tone');
        const text = textInput.value.trim();
        if (text === '') return;

        // Disable button during processing
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = `Processing ${tone}...`;

        try {
            const toneInstruction = `${button.textContent}\n\n`;
            const response = await fetch('http://localhost:3003/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: toneInstruction + text })
            });

            // Handle response errors
            if (!response.ok) {
                if (response.status === 413) {
                    throw new Error('PayloadTooLargeError');
                } else {
                    throw new Error(`Network response was not ok, status: ${response.status}`);
                }
            }

            const data = await response.json();
            let summary = formatBulletPointsAndBoldText(data.summary);

            // Create summary display
            const summaryDiv = document.createElement('div');
            summaryDiv.innerHTML = `
                <pre class="code-block">${summary}</pre>
                <button class="copy-button">📋 Copy</button>
            `;

            // Update popup
            summaryOutput.innerHTML = '';
            summaryOutput.appendChild(summaryDiv);
            summaryPopup.style.display = 'flex';

            // Add copy functionality
            document.querySelectorAll('.copy-button').forEach((copyBtn) => {
                copyBtn.addEventListener('click', handleCopyClick);
            });

        } catch (error) {
            console.error('Fetch error:', error);
            
            // User-friendly error handling
            if (error.message === 'PayloadTooLargeError') {
                alert('The text is too large, try making the text smaller.');
            } else {
                alert('An error occurred while processing your request. Please try again later.');
            }
        } finally {
            // Reset button state
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    // Handle copy button click
    function handleCopyClick(event) {
        const codeBlock = event.target.previousElementSibling;
        const code = codeBlock.innerText;
        
        navigator.clipboard.writeText(code).then(() => {
            event.target.innerText = '✓ Copied!';
            setTimeout(() => {
                event.target.innerText = '📋 Copy';
            }, 2000);
        });
    }

    // Formatting function for summary output
    function formatBulletPointsAndBoldText(text) {
        // Convert markdown-like bullet points to HTML list items
        let formattedText = text.replace(/^- /gm, '<li>');
        
        // Bold text handling
        formattedText = formattedText.replace(/^(\d+\.)\s*(\*\*.+?\*\*)/gm, '$1 <b>$2</b>');
        formattedText = formattedText.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

        // Table conversion
        const tableRegex = /(\|.+\|[\r\n|\n]+\|[-\s|:]+[\r\n|\n]+(?:\|.*\|[\r\n|\n]+)*)/gm;
        formattedText = formattedText.replace(tableRegex, (match) => {
            const rows = match.trim().split('\n').map(row => 
                row.trim().split('|').filter(cell => cell.trim() !== '')
            );
            
            let tableHTML = '<table border="1" style="width:100%; border-collapse: collapse;">';
            rows.forEach((cells) => {
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
});