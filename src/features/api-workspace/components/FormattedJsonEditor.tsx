"use client";

import React, { useState, useEffect, useRef } from "react";

interface FormattedJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  showLineNumbers?: boolean;
  highlightCurrentLine?: boolean;
}

// JSON高亮颜色定义
const variableColor = "#0070f3"; // 蓝色 for {{variable}}
const keyColor = "#ff8c00";     // 橙色 for JSON keys
const booleanColor = "#e74c3c"; // 红色 for boolean values (true/false)
const numberColor = "#2ecc71";  // 绿色 for number values
// 字符串值保持黑色（默认文本颜色）

/**
 * JSON编辑器组件 - 双模式设计
 * 编辑模式：使用textarea确保光标行为正确
 * 显示模式：使用div显示带语法高亮的JSON
 */
export function FormattedJsonEditor({
  value,
  onChange,
  className = "",
  placeholder = "请输入JSON格式的请求体内容",
  showLineNumbers = false,
  highlightCurrentLine = false
}: FormattedJsonEditorProps) {
  const [currentValue, setCurrentValue] = useState("");
  const [highlightedHtml, setHighlightedHtml] = useState("");
  const [isEditing, setIsEditing] = useState(false); // 是否处于编辑模式
  const [currentLine, setCurrentLine] = useState(1);
  const [lineHeight, setLineHeight] = useState(24); // 动态行高
  const [paddingTop, setPaddingTop] = useState(12); // 动态获取padding
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // 计算实际行高和padding
  const calculateLayoutMetrics = () => {
    if (!textareaRef.current) return { lineHeight: 24, paddingTop: 12 };
    
    const textarea = textareaRef.current;
    const styles = window.getComputedStyle(textarea);
    const fontSize = parseFloat(styles.fontSize);
    const lineHeightStyle = styles.lineHeight;
    const paddingTopStyle = parseFloat(styles.paddingTop);
    
    let calculatedLineHeight;
    if (lineHeightStyle === 'normal') {
      calculatedLineHeight = fontSize * 1.2;
    } else if (lineHeightStyle.endsWith('px')) {
      calculatedLineHeight = parseFloat(lineHeightStyle);
    } else if (!isNaN(parseFloat(lineHeightStyle))) {
      calculatedLineHeight = fontSize * parseFloat(lineHeightStyle);
    } else {
      calculatedLineHeight = fontSize * 1.2;
    }
    
    return {
      lineHeight: Math.ceil(calculatedLineHeight),
      paddingTop: paddingTopStyle || 12
    };
  };
  
  /**
   * 格式化JSON字符串
   */
  const formatJSON = (jsonStr: string): string => {
    if (!jsonStr || jsonStr.trim() === "") return "";
    
    try {
      // 尝试解析和格式化JSON
      const parsed = JSON.parse(jsonStr.trim());
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // 如果解析失败，返回原始字符串
      console.log("JSON格式无效，跳过格式化");
      return jsonStr;
    }
  };
  
  /**
   * 生成带有语法高亮的HTML内容
   */
  const generateHighlightedHtml = (jsonStr: string): string => {
    // 如果为空，返回空字符串
    if (!jsonStr || jsonStr.trim() === "") return "";
    
    // 步骤 1: 将JSON分解为令牌
    type Token = {
      type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'variable' | 'whitespace';
      value: string;
    };
    
    const tokens: Token[] = [];
    let position = 0;
    
    // 编写一个简单的词法分析器来标记不同的JSON元素
    while (position < jsonStr.length) {
      let char = jsonStr[position];
      
      // 处理空白字符
      if (/\s/.test(char)) {
        let whitespace = '';
        while (position < jsonStr.length && /\s/.test(jsonStr[position])) {
          whitespace += jsonStr[position++];
        }
        tokens.push({ type: 'whitespace', value: whitespace });
        continue;
      }
      
      // 处理变量占位符 {{variable}}
      if (char === '{' && jsonStr[position + 1] === '{') {
        let variable = '';
        let start = position;
        while (position < jsonStr.length && !(jsonStr[position] === '}' && jsonStr[position + 1] === '}' && variable.includes('{'))) {
          variable += jsonStr[position++];
        }
        // 添加结束的两个花括号
        if (position < jsonStr.length) {
          variable += jsonStr[position++];
          if (position < jsonStr.length) {
            variable += jsonStr[position++];
          }
        }
        tokens.push({ type: 'variable', value: variable });
        continue;
      }
      
      // 处理字符串
      if (char === '"') {
        let startPosition = position;
        position++; // 跳过开始引号
        
        // 检查当前字符串是否作为键名
        let endPosition = position;
        let isKey = false;
        while (endPosition < jsonStr.length && jsonStr[endPosition] !== '"') {
          if (endPosition < jsonStr.length - 1 && jsonStr[endPosition] === '\\') {
            endPosition += 2; // 跳过转义字符
          } else {
            endPosition++;
          }
        }
        
        if (endPosition < jsonStr.length) {
          // 查找字符串结束后的内容是否有冒号
          let afterString = endPosition + 1;
          while (afterString < jsonStr.length && /\s/.test(jsonStr[afterString])) {
            afterString++;
          }
          isKey = afterString < jsonStr.length && jsonStr[afterString] === ':';
        }
        
        if (isKey) {
          // 如果是键名，直接完整处理
          let keyString = jsonStr.substring(startPosition, endPosition + 1);
          tokens.push({ type: 'key', value: keyString });
          position = endPosition + 1;
        } else {
          // 如果是字符串值，需要处理内部变量
          // 先添加开始引号
          tokens.push({ type: 'string', value: '"' });
          
          // 解析字符串内容，处理变量占位符
          while (position < jsonStr.length) {
            if (jsonStr[position] === '"' && jsonStr[position - 1] !== '\\') {
              // 结束引号
              tokens.push({ type: 'string', value: '"' });
              position++;
              break;
            }
            
            // 检测是否有变量占位符
            if (position < jsonStr.length - 1 && 
                jsonStr[position] === '{' && 
                jsonStr[position + 1] === '{') {
              
              // 收集当前字符串片段
              let currentPart = jsonStr.substring(position, position + 2);
              position += 2;
              
              // 收集变量名称
              while (position < jsonStr.length - 1 && 
                     !(jsonStr[position] === '}' && jsonStr[position + 1] === '}')) {
                currentPart += jsonStr[position++];
              }
              
              // 添加结束花括号
              if (position < jsonStr.length - 1 && 
                  jsonStr[position] === '}' && 
                  jsonStr[position + 1] === '}') {
                currentPart += "}}";
                position += 2;
              }
              
              tokens.push({ type: 'variable', value: currentPart });
            } else {
              // 普通字符，直接添加
              tokens.push({ type: 'string', value: jsonStr[position] });
              position++;
            }
          }
        }
        continue;
      }
      
      // 处理数字
      if (/[0-9-]/.test(char)) {
        let number = '';
        while (position < jsonStr.length && /[0-9.e+-]/.test(jsonStr[position])) {
          number += jsonStr[position++];
        }
        tokens.push({ type: 'number', value: number });
        continue;
      }
      
      // 处理布尔值和空值
      if (char === 't' || char === 'f' || char === 'n') {
        if (jsonStr.substr(position, 4) === 'true') {
          tokens.push({ type: 'boolean', value: 'true' });
          position += 4;
          continue;
        }
        if (jsonStr.substr(position, 5) === 'false') {
          tokens.push({ type: 'boolean', value: 'false' });
          position += 5;
          continue;
        }
        if (jsonStr.substr(position, 4) === 'null') {
          tokens.push({ type: 'null', value: 'null' });
          position += 4;
          continue;
        }
      }
      
      // 处理标点符号
      tokens.push({ type: 'punctuation', value: char });
      position++;
    }
    
    // 步骤 2: 将令牌转换为HTML
    // 使用更改的渲染方式，保留了字符串中变量的高亮
    let html = '';
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      switch (token.type) {
        case 'key':
          html += `<span class="json-key" style="color: ${keyColor} !important; font-weight: bold !important;">${escapeHtml(token.value)}</span>`;
          break;
        case 'string':
          // 字符串值特殊处理，允许内部变量有不同颜色
          if (token.value === '"') {
            // 检查是开始还是结束引号
            const isStartQuote = (i === 0 || tokens[i-1].type !== 'string' && tokens[i-1].type !== 'variable');
            const isEndQuote = !isStartQuote;
            
            // 开始引号，开始一个新的字符串span
            if (isStartQuote) {
              html += `<span style="color: #008000 !important;">${escapeHtml(token.value)}`;
            } else if (isEndQuote) {
              // 结束引号，关闭字符串span
              html += `${escapeHtml(token.value)}</span>`;
            }
          } else {
            // 字符串内容
            html += `<span style="color: #008000 !important;">${escapeHtml(token.value)}</span>`;
          }
          break;
        case 'number':
          html += `<span class="json-number" style="color: ${numberColor} !important;">${escapeHtml(token.value)}</span>`;
          break;
        case 'boolean':
          html += `<span class="json-bool" style="color: ${booleanColor} !important;">${escapeHtml(token.value)}</span>`;
          break;
        case 'null':
          html += `<span style="color: #0000FF !important;">${escapeHtml(token.value)}</span>`;
          break;
        case 'variable':
          // 变量占位符始终使用独立颜色
          html += `<span class="json-var" style="color: ${variableColor} !important; font-weight: bold !important;">${escapeHtml(token.value)}</span>`;
          break;
        case 'whitespace':
          // 替换换行和空格
          html += token.value
            .replace(/\n/g, '<br>')
            .replace(/ /g, '&nbsp;');
          break;
        default:
          html += escapeHtml(token.value);
      }
    }
    
    return html;
  };
  
  /**
   * HTML特殊字符转义
   */
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // 处理光标位置变化
  const handleCursorPositionChange = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const text = textarea.value;
    const cursorPosition = textarea.selectionStart;
    
    // 计算当前行号
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lineNumber = textBeforeCursor.split('\n').length;
    setCurrentLine(lineNumber);
  };

  // 同步滚动
  const handleScroll = () => {
    if (!textareaRef.current || !lineNumbersRef.current) return;
    
    lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
  };

  // 计算行数
  const getLineCount = () => {
    return currentValue.split('\n').length;
  };

  // 生成行号
  const renderLineNumbers = () => {
    const lineCount = getLineCount();
    const numbers = [];
    for (let i = 1; i <= lineCount; i++) {
      numbers.push(
        <div
          key={i}
          className={`text-right px-2 text-xs font-mono select-none flex items-center justify-end ${
            highlightCurrentLine && i === currentLine
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-muted-foreground'
          }`}
          style={{ 
            height: `${lineHeight}px`,
            lineHeight: `${lineHeight}px`
          }}
        >
          {i}
        </div>
      );
    }
    return numbers;
  };
  
  /**
   * 处理初始化和外部值变化
   */
  useEffect(() => {
    // 首次加载或value变化时都执行，移除条件检查以确保初始值正确处理
    try {
      // 尝试格式化JSON
      if (value && value.trim() !== "") {
        const formatted = formatJSON(value);
        setCurrentValue(formatted);
        
        // 更新高亮HTML
        const highlighted = generateHighlightedHtml(formatted);
        setHighlightedHtml(highlighted);
      }
    } catch (e) {
      // 如果格式化失败，使用原始值
      setCurrentValue(value || "");
      setHighlightedHtml(generateHighlightedHtml(value || ""));
    }
  }, [value]);

  // 计算并更新布局参数
  useEffect(() => {
    const updateLayoutMetrics = () => {
      const metrics = calculateLayoutMetrics();
      setLineHeight(metrics.lineHeight);
      setPaddingTop(metrics.paddingTop);
    };

    const textarea = textareaRef.current;
    if (!textarea) return;

    // 初始计算
    updateLayoutMetrics();

    // 监听字体加载完成
    if (document.fonts) {
      document.fonts.ready.then(updateLayoutMetrics);
    }

    // 监听resize事件（字体大小可能改变）
    const resizeObserver = new ResizeObserver(updateLayoutMetrics);
    resizeObserver.observe(textarea);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isEditing]);

  // 监听textarea的事件用于行号和高亮功能
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener('keyup', handleCursorPositionChange);
    textarea.addEventListener('mouseup', handleCursorPositionChange);
    textarea.addEventListener('scroll', handleScroll);

    return () => {
      textarea.removeEventListener('keyup', handleCursorPositionChange);
      textarea.removeEventListener('mouseup', handleCursorPositionChange);
      textarea.removeEventListener('scroll', handleScroll);
    };
  }, [isEditing]);
  
  /**
   * 切换到编辑模式
   */
  const enableEditMode = () => {
    // 只有在非编辑模式时才切换
    if (!isEditing) {
      setIsEditing(true);
      // 延迟聚焦到textarea，确保DOM已更新
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    }
  };
  
  /**
   * 退出编辑模式并格式化
   */
  const exitEditMode = () => {
    // 只有在编辑模式时才处理
    if (isEditing) {
      try {
        // 尝试格式化当前内容
        const formatted = formatJSON(currentValue);
        setCurrentValue(formatted);
        onChange(formatted);
        
        // 更新高亮显示
        const highlighted = generateHighlightedHtml(formatted);
        setHighlightedHtml(highlighted);
      } catch (e) {
        // 格式化失败，保持原内容
        console.error("格式化失败", e);
      }
      
      // 退出编辑模式
      setIsEditing(false);
    }
  };
  
  /**
   * 处理内容变化
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCurrentValue(newValue);
    onChange(newValue); // 实时更新外部值
  };
  
  /**
   * 处理按键事件，支持Tab键缩进
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 处理Tab键
    if (e.key === "Tab") {
      e.preventDefault();
      
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // 插入两个空格作为缩进
      const newValue = 
        currentValue.substring(0, start) + 
        "  " + 
        currentValue.substring(end);
      
      // 更新值并恢复光标位置
      setCurrentValue(newValue);
      onChange(newValue);
      
      // 延迟设置光标位置，确保DOM已更新
      setTimeout(() => {
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }
      }, 0);
    }
  };
  
  // 处理粘贴事件，在粘贴后尝试格式化
  const handlePaste = () => {
    // 延迟处理粘贴内容
    setTimeout(() => {
      if (textareaRef.current) {
        const pastedContent = textareaRef.current.value;
        setCurrentValue(pastedContent);
        onChange(pastedContent);
      }
    }, 0);
  };
  
  return (
    <div className={`relative flex border rounded-md overflow-hidden ${className}`}>
      {/* 行号区域 */}
      {showLineNumbers && (
        <div
          ref={lineNumbersRef}
          className="bg-muted/50 border-r overflow-hidden"
          style={{ 
            width: `${Math.max(String(getLineCount()).length * 9 + 16, 48)}px`, // 根据字体调整宽度
            maxHeight: '100%',
            fontSize: '14px', // 确保行号字体大小一致
            paddingTop: `${paddingTop}px`, // 与编辑区域的padding保持一致
            paddingBottom: `${paddingTop}px`
          }}
        >
          <div className="sticky top-0">
            {renderLineNumbers()}
          </div>
        </div>
      )}
      
      {/* 编辑器区域 */}
      <div className="flex-1 relative">
        <div
          ref={containerRef}
          className="relative w-full h-full overflow-hidden"
          style={{ minHeight: "200px" }}
          onClick={enableEditMode} // 点击容器进入编辑模式
        >
          {/* 当前行高亮背景 */}
          {highlightCurrentLine && isEditing && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent ${paddingTop + (currentLine - 1) * lineHeight}px, rgba(59, 130, 246, 0.1) ${paddingTop + (currentLine - 1) * lineHeight}px, rgba(59, 130, 246, 0.1) ${paddingTop + currentLine * lineHeight}px, transparent ${paddingTop + currentLine * lineHeight}px)`
              }}
            />
          )}
          
          {/* 编辑模式：textarea */}
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={currentValue}
              onChange={handleChange}
              onBlur={exitEditMode} // 失焦时退出编辑模式
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              spellCheck={false}
              className="w-full h-full p-3 font-mono outline-none resize-none whitespace-pre bg-transparent"
              style={{ 
                minHeight: "100%",
                lineHeight: `${lineHeight}px`,
                fontSize: '14px',
                paddingLeft: showLineNumbers ? '8px' : '12px'
              }}
              autoFocus
            />
          ) : (
            /* 显示模式：带语法高亮的内容 */
            <div 
              className="w-full h-full p-3 font-mono whitespace-pre-wrap overflow-auto syntax-highlight"
              style={{ 
                color: "inherit",
                lineHeight: `${lineHeight}px`,
                fontSize: '14px',
                paddingLeft: showLineNumbers ? '8px' : '12px'
              }}
              dangerouslySetInnerHTML={{ 
                __html: highlightedHtml || 
                  (placeholder ? 
                    `<span class="text-gray-400">${placeholder}</span>` : 
                    ""
                  )
              }}
            ></div>
          )}
        </div>
      </div>
    </div>
  );
}
