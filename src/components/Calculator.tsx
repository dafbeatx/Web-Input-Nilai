"use client";

import React, { useState, useCallback } from "react";
import { Copy, Clock, ChevronDown, Trash2, Check } from "lucide-react";

interface HistoryEntry {
  expression: string;
  result: string;
}

function factorial(n: number): number {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export default function Calculator() {
  const [display, setDisplay] = useState("0");
  const [prevResult, setPrevResult] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mode, setMode] = useState<"basic" | "scientific">("basic");
  const [showHistory, setShowHistory] = useState(false);
  const [isRadians, setIsRadians] = useState(false);
  const [copied, setCopied] = useState(false);
  const [justEvaluated, setJustEvaluated] = useState(false);

  const appendToDisplay = useCallback((val: string) => {
    setDisplay((prev) => {
      if (justEvaluated) {
        setJustEvaluated(false);
        // If user types an operator after eval, chain from result
        if (["+", "-", "×", "÷", "%"].includes(val)) {
          return prevResult + val;
        }
        // Otherwise start fresh
        return val === "." ? "0." : val;
      }
      if (prev === "0" && val !== "." && !["+", "-", "×", "÷", "%"].includes(val)) {
        return val;
      }
      return prev + val;
    });
  }, [justEvaluated, prevResult]);

  const handleClear = () => {
    setDisplay("0");
    setPrevResult("");
    setJustEvaluated(false);
  };

  const handleDelete = () => {
    setDisplay((prev) => {
      if (justEvaluated) {
        setJustEvaluated(false);
        return "0";
      }
      // Check if last part is a function name like "sin(", "cos(", "log(", "ln(", "tan(", "sqrt("
      const funcMatch = prev.match(/(sin|cos|tan|log|ln|sqrt)\($/);
      if (funcMatch) {
        return prev.slice(0, -funcMatch[0].length) || "0";
      }
      return prev.length <= 1 ? "0" : prev.slice(0, -1);
    });
  };

  const evaluate = () => {
    try {
      let expr = display;

      // Replace display symbols with JS operators
      expr = expr.replace(/×/g, "*");
      expr = expr.replace(/÷/g, "/");
      expr = expr.replace(/π/g, `(${Math.PI})`);
      expr = expr.replace(/e(?!xp)/g, `(${Math.E})`);

      // Handle factorial: number followed by !
      expr = expr.replace(/(\d+)!/g, (_, n) => `(${factorial(parseInt(n))})`);

      // Handle implicit multiplication: 2(3) -> 2*(3), )(  -> )*(
      expr = expr.replace(/(\d)\(/g, "$1*(");
      expr = expr.replace(/\)\(/g, ")*(");

      // Handle trig functions with degree/radian conversion
      const trigReplace = (fn: string) => {
        const regex = new RegExp(`${fn}\\(`, "g");
        if (isRadians) {
          expr = expr.replace(regex, `Math.${fn}(`);
        } else {
          expr = expr.replace(regex, `Math.${fn}((Math.PI/180)*`);
        }
      };
      trigReplace("sin");
      trigReplace("cos");
      trigReplace("tan");

      // Handle other math functions
      expr = expr.replace(/sqrt\(/g, "Math.sqrt(");
      expr = expr.replace(/log\(/g, "Math.log10(");
      expr = expr.replace(/ln\(/g, "Math.log(");

      // Handle power operator
      expr = expr.replace(/\^/g, "**");

      // Evaluate safely
      const fn = new Function(`"use strict"; return (${expr});`);
      const rawResult = fn();

      let resultStr: string;
      if (typeof rawResult === "number") {
        if (Number.isNaN(rawResult)) {
          resultStr = "Error";
        } else if (!Number.isFinite(rawResult)) {
          resultStr = rawResult > 0 ? "∞" : "-∞";
        } else {
          // Round to avoid floating point quirks, max 10 decimal places
          resultStr = parseFloat(rawResult.toFixed(10)).toString();
        }
      } else {
        resultStr = "Error";
      }

      setHistory((prev) => [{ expression: display, result: resultStr }, ...prev].slice(0, 50));
      setPrevResult(resultStr);
      setDisplay(resultStr);
      setJustEvaluated(true);
    } catch {
      setDisplay("Error");
      setJustEvaluated(true);
    }
  };

  const handleToggleSign = () => {
    setDisplay((prev) => {
      if (prev === "0" || prev === "Error") return prev;
      if (prev.startsWith("-")) return prev.slice(1);
      return "-" + prev;
    });
  };

  const handlePercent = () => {
    try {
      let expr = display.replace(/×/g, "*").replace(/÷/g, "/");
      const fn = new Function(`"use strict"; return (${expr});`);
      const val = fn();
      if (typeof val === "number" && Number.isFinite(val)) {
        const result = (val / 100).toString();
        setDisplay(result);
      }
    } catch { /* ignore */ }
  };

  const insertFunction = (fn: string) => {
    if (justEvaluated) {
      setJustEvaluated(false);
      // Apply function to previous result
      setDisplay(`${fn}(${prevResult}`);
    } else {
      appendToDisplay(`${fn}(`);
    }
  };

  const handleSquare = () => {
    if (justEvaluated) {
      setJustEvaluated(false);
      setDisplay(`(${prevResult})^2`);
    } else {
      appendToDisplay("^2");
    }
  };

  const handlePower = () => {
    if (justEvaluated) {
      setJustEvaluated(false);
      setDisplay(`${prevResult}^`);
    } else {
      appendToDisplay("^");
    }
  };

  const handleFactorial = () => {
    appendToDisplay("!");
  };

  const handleConstant = (constant: string) => {
    if (justEvaluated) {
      setJustEvaluated(false);
      setDisplay(constant);
    } else if (display === "0") {
      setDisplay(constant);
    } else {
      appendToDisplay(constant);
    }
  };

  const handleCopy = async () => {
    const textToCopy = prevResult || display;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setDisplay(entry.result);
    setPrevResult(entry.result);
    setJustEvaluated(true);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  // Button component
  const Btn = ({
    label,
    onClick,
    className = "",
    span = 1,
  }: {
    label: string | React.ReactNode;
    onClick: () => void;
    className?: string;
    span?: number;
  }) => (
    <button
      onClick={onClick}
      className={`calc-btn ${className} ${span === 2 ? "col-span-2" : ""}`}
    >
      {label}
    </button>
  );

  return (
    <div className="calc-container">
      {/* Display */}
      <div className="calc-display-area">
        <div className="calc-display-top">
          <button
            onClick={() => setShowHistory(true)}
            className="calc-icon-btn"
            title="History"
          >
            <Clock size={18} />
          </button>
          <button
            onClick={handleCopy}
            className="calc-icon-btn"
            title="Copy"
          >
            {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
          </button>
        </div>

        {/* Expression & Result */}
        <div className="calc-expression">
          {prevResult && justEvaluated ? "" : display !== "0" ? display : ""}
        </div>
        <div className="calc-result">
          {justEvaluated ? display : prevResult || "0"}
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="calc-mode-toggle">
        <button
          onClick={() => setMode("basic")}
          className={`calc-mode-btn ${mode === "basic" ? "calc-mode-active" : ""}`}
        >
          Basic
        </button>
        <button
          onClick={() => setMode("scientific")}
          className={`calc-mode-btn ${mode === "scientific" ? "calc-mode-active" : ""}`}
        >
          Scientific
        </button>
        {mode === "scientific" && (
          <button
            onClick={() => setIsRadians(!isRadians)}
            className="calc-deg-btn"
          >
            {isRadians ? "RAD" : "DEG"}
          </button>
        )}
      </div>

      {/* Scientific buttons row */}
      {mode === "scientific" && (
        <div className="calc-sci-grid">
          <Btn label="sin" onClick={() => insertFunction("sin")} className="calc-fn" />
          <Btn label="cos" onClick={() => insertFunction("cos")} className="calc-fn" />
          <Btn label="tan" onClick={() => insertFunction("tan")} className="calc-fn" />
          <Btn label="log" onClick={() => insertFunction("log")} className="calc-fn" />
          <Btn label="ln" onClick={() => insertFunction("ln")} className="calc-fn" />
          <Btn label="√" onClick={() => insertFunction("sqrt")} className="calc-fn" />
          <Btn label="x²" onClick={handleSquare} className="calc-fn" />
          <Btn label="xʸ" onClick={handlePower} className="calc-fn" />
          <Btn label="n!" onClick={handleFactorial} className="calc-fn" />
          <Btn label="π" onClick={() => handleConstant("π")} className="calc-fn" />
          <Btn label="e" onClick={() => handleConstant("e")} className="calc-fn" />
          <Btn label="(" onClick={() => appendToDisplay("(")} className="calc-fn" />
          <Btn label=")" onClick={() => appendToDisplay(")")} className="calc-fn" />
          <Btn label="±" onClick={handleToggleSign} className="calc-fn" />
        </div>
      )}

      {/* Basic buttons grid */}
      <div className="calc-basic-grid">
        <Btn label="AC" onClick={handleClear} className="calc-clear" />
        <Btn label={mode === "basic" ? "(" : "⌫"} onClick={mode === "basic" ? () => appendToDisplay("(") : handleDelete} className="calc-util" />
        <Btn label={mode === "basic" ? ")" : "%"} onClick={mode === "basic" ? () => appendToDisplay(")") : handlePercent} className="calc-util" />
        <Btn label="÷" onClick={() => appendToDisplay("÷")} className="calc-op" />

        <Btn label="7" onClick={() => appendToDisplay("7")} className="calc-num" />
        <Btn label="8" onClick={() => appendToDisplay("8")} className="calc-num" />
        <Btn label="9" onClick={() => appendToDisplay("9")} className="calc-num" />
        <Btn label="×" onClick={() => appendToDisplay("×")} className="calc-op" />

        <Btn label="4" onClick={() => appendToDisplay("4")} className="calc-num" />
        <Btn label="5" onClick={() => appendToDisplay("5")} className="calc-num" />
        <Btn label="6" onClick={() => appendToDisplay("6")} className="calc-num" />
        <Btn label="-" onClick={() => appendToDisplay("-")} className="calc-op" />

        <Btn label="1" onClick={() => appendToDisplay("1")} className="calc-num" />
        <Btn label="2" onClick={() => appendToDisplay("2")} className="calc-num" />
        <Btn label="3" onClick={() => appendToDisplay("3")} className="calc-num" />
        <Btn label="+" onClick={() => appendToDisplay("+")} className="calc-op" />

        {mode === "basic" && (
          <Btn label="±" onClick={handleToggleSign} className="calc-util" />
        )}
        {mode === "scientific" && (
          <Btn label="(" onClick={() => appendToDisplay("(")} className="calc-util" />
        )}
        <Btn label="0" onClick={() => appendToDisplay("0")} className="calc-num" />
        <Btn label="." onClick={() => appendToDisplay(".")} className="calc-num" />
        <Btn label="=" onClick={evaluate} className="calc-equals" />

        {mode === "basic" && (
          <>
            <Btn label="⌫" onClick={handleDelete} className="calc-util" span={2} />
            <Btn label="%" onClick={handlePercent} className="calc-util" span={2} />
          </>
        )}
      </div>

      {/* History Panel */}
      <div className={`calc-history-panel ${showHistory ? "calc-history-open" : ""}`}>
        <div className="calc-history-header">
          <h3 className="text-lg font-bold text-white font-outfit">History</h3>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button onClick={clearHistory} className="calc-icon-btn text-rose-400 hover:text-rose-300">
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={() => setShowHistory(false)} className="calc-icon-btn">
              <ChevronDown size={22} />
            </button>
          </div>
        </div>
        <div className="calc-history-list">
          {history.length === 0 ? (
            <p className="text-slate-500 text-center py-8 text-sm">Belum ada riwayat perhitungan</p>
          ) : (
            history.map((entry, i) => (
              <button
                key={i}
                onClick={() => loadFromHistory(entry)}
                className="calc-history-item"
              >
                <span className="text-slate-400 text-sm truncate">{entry.expression}</span>
                <span className="text-white font-bold text-lg font-outfit">= {entry.result}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
