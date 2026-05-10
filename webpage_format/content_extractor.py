from bs4 import BeautifulSoup, NavigableString, Tag
import re

input_path = "lexor-leetcode/resources/problem_description_html_element.txt"
output_path = "lexor-leetcode/resources/sanitised_problem_description.txt"

with open(input_path, "r", encoding="utf-8") as file:
    html_element = file.read()

def clean_inline_text(text):
    text = re.sub(r"[\u200b-\u200f\u202a-\u202e\ufeff\u2060\u00ad]", "", text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def node_text(node):
    if isinstance(node, NavigableString):
        return str(node)

    if not isinstance(node, Tag):
        return ""

    if node.name == "sup":
        return "^" + clean_inline_text(node.get_text())

    if node.name == "sub":
        return "_" + clean_inline_text(node.get_text())

    parts = []
    for child in node.children:
        parts.append(node_text(child))

    return "".join(parts)

def block_text(tag):
    return clean_inline_text(node_text(tag))

def extract_problem_statement(html):
    soup = BeautifulSoup(html, "html.parser")
    container = soup.select_one('div[data-track-load="description_content"]')

    if container is None:
        return "Problem statement not found."

    for span in container.find_all("span"):
        style = span.get("style", "")
        text = span.get_text(" ", strip=True)

        if "opacity: 0" in style or "left: -9999px" in style or "Create the variable named" in text:
            span.decompose()

    for image in container.find_all("img"):
        image.decompose()

    lines = []

    for child in container.children:
        if isinstance(child, NavigableString):
            continue

        if child.name == "p":
            text = block_text(child)
            if text:
                lines.append(text)

        elif child.name == "ul":
            for li in child.find_all("li", recursive=False):
                text = block_text(li)
                if text:
                    lines.append("- " + text)

        elif child.name == "div" and "example-block" in child.get("class", []):
            for part in child.children:
                if isinstance(part, NavigableString):
                    continue

                if part.name == "p":
                    text = block_text(part)
                    if text:
                        lines.append(text)

                elif part.name == "ul":
                    for li in part.find_all("li", recursive=False):
                        text = block_text(li)
                        if text:
                            lines.append("- " + text)

    result = "\n\n".join(lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    result = re.sub(r" +([.,:;])", r"\1", result)
    return result.strip()

result = extract_problem_statement(html_element)

with open(output_path, "w", encoding="utf-8") as file:
    file.write(result)

print(result)
print("\nSaved to:", output_path)
