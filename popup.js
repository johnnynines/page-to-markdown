document.getElementById('scrape').addEventListener('click', () => {
  const omitContent = document.getElementById('omit-content').checked;
  const additionalSelectors = document.getElementById('additional-selectors').value;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: scrapeContent,
        args: [omitContent, additionalSelectors]
      },
      (results) => {
        document.getElementById('outputField').value = results[0].result;
      }
    );
  });
});

document.getElementById('copy').addEventListener('click', () => {
  const output = document.getElementById('outputField').value;
  navigator.clipboard.writeText(output).then(() => {
    alert('Output copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
});

document.getElementById('theme-toggle').addEventListener('change', (event) => {
  if (event.target.checked) {
    localStorage.setItem('theme', 'dark');
    document.body.classList.add('dark-mode');
  } else {
    localStorage.setItem('theme', 'light');
    document.body.classList.remove('dark-mode');
  }
  location.reload();
});

window.addEventListener('DOMContentLoaded', () => {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-toggle').checked = true;
  }
});

function scrapeContent(omitContent, additionalSelectors) {
  function getTextContent(element) {
    if (element.tagName === 'CODE' && ['P', 'LI', 'SPAN'].includes(element.parentElement.tagName)) {
      return `\`${element.textContent}\``;
    }
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

  const defaultSelectors = 'nav, .sidebar, #sidebar-content, .pagination, footer, .table-of-contents, #table-of-contents-content';
  const selectors = omitContent ? defaultSelectors + (additionalSelectors ? `, ${additionalSelectors}` : '') : additionalSelectors;
  const elementsToOmit = selectors ? document.querySelectorAll(selectors) : [];
  const elementsToOmitSet = new Set(elementsToOmit);
  console.log('Elements to omit:', elementsToOmitSet);

  const rootElement = document.body;
  const markdownContent = collectMarkdown(rootElement, elementsToOmitSet);

  return markdownContent;
}