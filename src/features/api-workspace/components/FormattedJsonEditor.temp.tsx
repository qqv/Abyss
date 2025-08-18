"use client";

import React, { useState, useEffect, useRef } from "react";

interface FormattedJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
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
  placeholder = ""
}: FormattedJsonEditorProps) {
  // 状态管理
  const [currentValue, setCurrentValue] = useState(value || "");
  const [isEditing, setIsEditing] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState("");
  
  // 引用
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
    
    // 简单的HTML转义（防止XSS）
    let html = jsonStr
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // 1. 高亮JSON键名
    html = html.replace(/"([^"]+)"(?=\s*:)/g, (match, key) => {
      return `<span style="color: ${keyColor};">"${key}"</span>`;
    });
    
    // 2. 高亮布尔值
    html = html.replace(/:\s*(true|false)(?=\s*,|\s*}|\s*$)/g, (match, value) => {
      return `: <span style="color: ${booleanColor};">${value}</span>`;
    });
    
    // 3. 高亮数字值
    html = html.replace(/:\s*(\d+(?:\.\d+)?)(?=\s*,|\s*}|\s*$)/g, (match, value) => {
      return `: <span style="color: ${numberColor};">${value}</span>`;
    });
    
    // 4. 高亮变量占位符 {{variable}}
    html = html.replace(
      /{{([^}]+?)}}/g, 
      `<span style="color: ${variableColor};">{{$1}}</span>`
    );
    
    // 确保换行正确显示
    html = html.replace(/\n/g, "<br>");
    html = html.replace(/ /g, "&nbsp;");
    
    return html;
  };
  
  /**
   * 处理初始化和外部值变化
   */
  useEffect(() => {
    // 仅在外部value变化时更新
    if (value !== currentValue) {
      try {
        // 尝试格式化JSON
        const formatted = formatJSON(value || "");
        setCurrentValue(formatted);
        
        // 更新高亮HTML
        const highlighted = generateHighlightedHtml(formatted);
        setHighlightedHtml(highlighted);
      } catch (e) {
        // 如果格式化失败，使用原始值
        setCurrentValue(value || "");
        setHighlightedHtml(generateHighlightedHtml(value || ""));
      }
    }
  }, [value]);
  
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
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden border rounded ${className}`}
      style={{ minHeight: "200px" }}
      onClick={enableEditMode} // 点击容器进入编辑模式
    >
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
          className="w-full h-full p-3 font-mono outline-none resize-none whitespace-pre"
          style={{ minHeight: "100%" }}
          autoFocus
        />
      ) : (
        /* 显示模式：带语法高亮的内容 */
        <div 
          className="w-full h-full p-3 font-mono whitespace-pre-wrap overflow-auto"
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
  );
}
