document.getElementById('scrape').addEventListener('click', () => {
  const omitContent = document.getElementById('omit-content').checked;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: scrapeContent,
        args: [omitContent]
      },
      (results) => {
        document.getElementById('output').value = results[0].result;
      }
    );
  });
});

document.getElementById('copy').addEventListener('click', () => {
  const output = document.getElementById('output').value;
  navigator.clipboard.writeText(output).then(() => {
    alert('Output copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
});

function scrapeContent(omitContent) {
  function getTextContent(element) {
    return element.childNodes.length ? Array.from(element.childNodes).map(getTextContent).join('') : element.textContent;
  }

  function getMarkdown(element) {
    if (element.tagName === 'H1') return `# ${getTextContent(element)}\n\n`;
    if (element.tagName === 'H2') return `## ${getTextContent(element)}\n\n`;
    if (element.tagName === 'H3') return `### ${getTextContent(element)}\n\n`;
    if (element.tagName === 'H4') return `#### ${getTextContent(element)}\n\n`;
    if (element.tagName === 'H5') return `##### ${getTextContent(element)}\n\n`;
    if (element.tagName === 'H6') return `###### ${getTextContent(element)}\n\n`;
    if (element.tagName === 'P') return `${getTextContent(element)}\n\n`;
    if (element.tagName === 'BLOCKQUOTE') return `> ${getTextContent(element)}\n\n`;
    if (element.tagName === 'PRE') return `\`\`\`\n${getTextContent(element)}\n\`\`\`\n\n`;
    if (element.tagName === 'CODE' && element.parentElement.tagName !== 'PRE') {
      return `\`${getTextContent(element)}\``;
    }
    if (element.tagName === 'UL') return `${Array.from(element.children).map(li => `- ${getTextContent(li)}`).join('\n')}\n\n`;
    if (element.tagName === 'OL') return `${Array.from(element.children).map((li, i) => `${i + 1}. ${getTextContent(li)}`).join('\n')}\n\n`;
    if (element.tagName === 'TABLE') {
      const rows = Array.from(element.rows);
      const headers = Array.from(rows.shift().cells).map(cell => getTextContent(cell)).join(' | ');
      const separator = headers.split(' | ').map(() => '---').join(' | ');
      const body = rows.map(row => Array.from(row.cells).map(cell => getTextContent(cell)).join(' | ')).join('\n');
      return `${headers}\n${separator}\n${body}\n\n`;
    }
    return '';
  }

  function collectMarkdown(element, elementsToOmitSet) {
    if (elementsToOmitSet.has(element)) return '';
    let markdown = getMarkdown(element);
    element.childNodes.forEach(child => {
      markdown += collectMarkdown(child, elementsToOmitSet);
    });
    return markdown;
  }

  const elementsToOmit = omitContent ? document.querySelectorAll('nav, .sidebar, #sidebar-content, .pagination, footer, .table-of-contents, #table-of-contents-content') : [];
  const elementsToOmitSet = new Set(elementsToOmit);
  console.log('Elements to omit:', elementsToOmitSet);

  const rootElement = document.body;
  const markdownContent = collectMarkdown(rootElement, elementsToOmitSet);

  return markdownContent;
}