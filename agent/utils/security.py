"""
utils/security.py — LatentLearn 多维安全防护与敏感拦截层

功能：
  1. HTML 标签剥离（防止 XSS 脚本跨站攻击和注入污染）
  2. 递归清洗上传文档（防止注入文本对大模型及前端组件造成危害）
  3. 用户提问长度限制（防御 DoS 与 Token 爆满）
  4. 提示词注入拦截（秒级拦截绕过指令）
  5. 核心有毒/违规内容拦截（自残自杀、毒品枪支、网络诈骗、洗钱等）
"""

from __future__ import annotations

import re


# 1. 提示词注入攻击正则检测 (Prompt Injection Detection Patterns)
_INJECTION_PATTERNS = [
    r"ignore\s+(?:the\s+)?(?:previous|system|prior)\s+(?:instruction|prompt|rule|message|setting|directive)",
    r"forget\s+(?:the\s+)?(?:previous|system|prior)\s+(?:instruction|prompt|rule|message|setting|directive)",
    r"you\s+must\s+now\s+act\s+as",
    r"you\s+are\s+now\s+a\s+",
    r"bypass\s+(?:the\s+)?(?:system|security|filter|guardrail)",
    r"忽略(?:之前|先前的?)(?:指令|提示|规则|设定|说明|约束)",
    r"忘记(?:之前|先前的?)(?:指令|提示|规则|设定|说明|约束)",
    r"你现在(是|扮演|开始充当)\s*",
    r"解除(?:系统|安全)?限制",
    r"绕过(?:安全|系统|过滤)?",
    r"print\s+(?:your\s+)?system\s+(?:prompt|message|instruction)",
    r"输出(?:你?的?)?系统(?:提示词|指令|初始设置)"
]

# 2. 政治/黄暴/自残敏感词本地正则过滤 (Mild local keyword blacklist for toxic/illegal/self-harm queries)
_TOXIC_PATTERNS = [
    r"(?:自杀|自残|割腕|服毒|跳楼|不想活了|suicide|self-harm|kill\s+myself|end\s+my\s+life)",
    r"(?:吸毒|冰毒|海洛因|贩毒|大麻|meth|heroin|marijuana|drug\s+deal)",
    r"(?:制作炸弹|枪支制造|制造枪支|bomb\s+making|make\s+a\s+bomb|weapons\s+manufacturing)",
    r"(?:洗钱|诈骗|传销|money\s+laundering|scam|pyramid\s+scheme)"
]

# 3. HTML 标签剥离正则 (XSS Sanitizer)
_HTML_TAG_PATTERN = re.compile(r"<[^>]+>")


def sanitize_text(text: str | None) -> str | None:
    """过滤 HTML 标签以防止 XSS 攻击，保证文本纯净"""
    if not text:
        return text
    # 剥离所有 HTML 标签，只保留纯文本
    return _HTML_TAG_PATTERN.sub("", text).strip()


def sanitize_document(document: dict | None) -> dict | None:
    """
    递归清洗上传的学习文档：
      - 清洗标题 (title)
      - 清洗大章节正文 (content)
      - 递归清洗大纲小节结构 (structure)
    返回清洗后 100% 纯净、无 script/HTML 注入的安全文档字典。
    """
    if not document:
        return document
    
    sanitized = dict(document)
    
    if "title" in sanitized and isinstance(sanitized["title"], str):
        sanitized["title"] = sanitize_text(sanitized["title"])
        
    if "content" in sanitized and isinstance(sanitized["content"], str):
        sanitized["content"] = sanitize_text(sanitized["content"])
        
    if "structure" in sanitized and isinstance(sanitized["structure"], list):
        new_struct = []
        for sec in sanitized["structure"]:
            if isinstance(sec, dict):
                new_sec = dict(sec)
                if "title" in new_sec and isinstance(new_sec["title"], str):
                    new_sec["title"] = sanitize_text(new_sec["title"])
                if "content" in new_sec and isinstance(new_sec["content"], str):
                    new_sec["content"] = sanitize_text(new_sec["content"])
                new_struct.append(new_sec)
        sanitized["structure"] = new_struct
        
    return sanitized


def check_query_safety(query: str | None) -> tuple[bool, str | None]:
    """
    检查用户输入的安全健康状况。
    返回: (is_safe, error_hint)
    """
    if not query:
        return True, None

    # A. 限制输入长度，防止拒绝服务（DoS）或 Token 爆满
    if len(query) > 1000:
        return False, "Input query is too long (maximum 1000 characters). / 输入提问过长（最多支持 1000 字）。"

    # B. 过滤 HTML 注入 / XSS 并校验清洗后字符
    sanitized = sanitize_text(query)
    if not sanitized or not sanitized.strip():
        return False, "Input query is empty after sanitization. / 输入文本清洗后为空，请不要注入无效 HTML 代码。"

    # C. 提示词注入检测
    for pattern in _INJECTION_PATTERNS:
        if re.search(pattern, sanitized, re.IGNORECASE):
            return False, "Security Alert: Prompt injection attempt detected. Please stay on study focus. / 安全警告：检测到提示词指令注入，请专注于学术和文档阅读辅导。"

    # D. 敏感/有毒内容拦截
    for pattern in _TOXIC_PATTERNS:
        if re.search(pattern, sanitized, re.IGNORECASE):
            return False, "Safety Alert: Content violates safety guidelines. / 安全提示：提问涉及高风险或有害主题，已被系统自动拦截。"

    return True, None
