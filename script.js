/**
 * Conversor de bases numéricas (2, 4, 8, 10, 16).
 * Conversão feita via BigInt pra suportar números arbitrariamente grandes
 * sem perda de precisão (Number/parseInt estouram acima de 2^53).
 */

const DIGITS = "0123456789ABCDEF";

const BASE_NAMES = {
	2: "binário",
	4: "quaternário",
	8: "octal",
	10: "decimal",
	16: "hexadecimal",
};

const ACCEPTED_DIGITS = {
	2: "0 1",
	4: "0 1 2 3",
	8: "0 1 2 3 4 5 6 7",
	10: "0 1 2 3 4 5 6 7 8 9",
	16: "0-9 A-F",
};

// --- elements ---
const form = document.getElementById("converter-form");
const valueInput = document.getElementById("value-input");
const sourceBaseSelect = document.getElementById("source-base");
const targetBaseSelect = document.getElementById("target-base");
const swapButton = document.getElementById("swap-button");
const clearButton = document.getElementById("clear-button");
const copyButton = document.getElementById("copy-button");
const digitsHint = document.getElementById("digits-hint");

const resultPlaceholder = document.getElementById("result-placeholder");
const errorArea = document.getElementById("error-area");
const errorText = document.getElementById("error-text");
const singleOutput = document.getElementById("single-output");
const outputLabel = document.getElementById("output-label");
const outputValue = document.getElementById("output-value");
const allBasesTable = document.getElementById("all-bases-table");
const tableBody = document.getElementById("table-body");

/**
 * Valida uma string de entrada pra determinada base.
 * Regras: aceita sinal de menos opcional na frente, não aceita vazio,
 * espaços nas pontas são tolerados (trim), demais espaços não.
 * @param {string} rawValue
 * @param {number} base
 * @returns {{ ok: true, clean: string } | { ok: false, message: string }}
 */

function validateInput(rawValue, base) {
	const value = (rawValue ?? "").trim();

	if (value === "") {
		return { ok: false, message: "digite um valor pra converter." };
	}

	if (value === "-" || value === "+") {
		return { ok: false, message: "sinal sozinho não é número." };
	}

	const normalized = value.replace(/^\+/, "");

	const validAlphabet = DIGITS.slice(0, base);
	const regex = new RegExp(`^-?[${validAlphabet}]+$`, "i");

	if (!regex.test(normalized)) {
		return {
			ok: false,
			message: `"${rawValue.trim()}" tem dígito inválido pra base ${base} (aceita: ${ACCEPTED_DIGITS[base]}).`,
		};
	}

	return { ok: true, clean: normalized.toUpperCase() };
}

/**
 * Converte string numa base pra BigInt decimal (com sinal).
 * @param {string} value ja validado, maiúsculo, com sinal opcional
 * @param {number} base
 * @returns {bigint}
 */

function toDecimal(value, base) {
	const negative = value.startsWith("-");
	const digitsStr = negative ? value.slice(1) : value;
	const baseBig = BigInt(base);

	let accumulated = 0n;
	for (const char of digitsStr) {
		const digit = BigInt(DIGITS.indexOf(char));
		accumulated = accumulated * baseBig + digit;
	}

	return negative ? -accumulated : accumulated;
}

/**
 * Converte um BigInt decimal (com sinal) pra string em outra base.
 * @param {bigint} decimalValue
 * @param {number} base
 * @returns {string}
 */

function fromDecimal(decimalValue, base) {
	if (decimalValue === 0n) return "0";

	const negative = decimalValue < 0n;
	let remainder = negative ? -decimalValue : decimalValue;
	const baseBig = BigInt(base);

	let output = "";
	while (remainder > 0n) {
		const digit = Number(remainder % baseBig);
		output = DIGITS[digit] + output;
		remainder = remainder / baseBig;
	}

	return negative ? `-${output}` : output;
}

function convert(rawValue, sourceBase, targetBase) {
	const validation = validateInput(rawValue, sourceBase);
	if (!validation.ok) {
		return { ok: false, message: validation.message };
	}

	const decimal = toDecimal(validation.clean, sourceBase);
	const result = fromDecimal(decimal, targetBase);

	return { ok: true, result, decimal };
}

// --- interface ---

function hideAll() {
	resultPlaceholder.classList.add("hidden");
	errorArea.classList.add("hidden");
	singleOutput.classList.add("hidden");
	allBasesTable.classList.add("hidden");
}

function showError(message) {
	hideAll();
	errorText.textContent = message;
	errorArea.classList.remove("hidden");
	valueInput.classList.add("invalid");
}

function showSingleResult(value, targetBase) {
	hideAll();
	outputLabel.textContent = `base ${targetBase}`;
	outputValue.textContent = value;
	singleOutput.classList.remove("hidden");
	copyButton.classList.remove("copied");
	copyButton.textContent = "copiar";
}

function showAllBases(rawValue, sourceBase) {
	hideAll();
	tableBody.innerHTML = "";

	const targetBases = [2, 4, 8, 10, 16];
	for (const base of targetBases) {
		const row = document.createElement("tr");

		const nameCell = document.createElement("td");
		nameCell.textContent = `${base} — ${BASE_NAMES[base]}`;

		const valueCell = document.createElement("td");
		const conversion = convert(rawValue, sourceBase, base);
		valueCell.textContent = conversion.ok ? conversion.result : "—";

		row.append(nameCell, valueCell);
		tableBody.appendChild(row);
	}

	allBasesTable.classList.remove("hidden");
}

function onSubmit(event) {
	event.preventDefault();
	valueInput.classList.remove("invalid");

	const rawValue = valueInput.value;
	const sourceBase = Number(sourceBaseSelect.value);
	const targetStr = targetBaseSelect.value;

	if (targetStr === "all") {
		const check = validateInput(rawValue, sourceBase);
		if (!check.ok) {
			showError(check.message);
			return;
		}
		showAllBases(rawValue, sourceBase);
		return;
	}

	const targetBase = Number(targetStr);
	const conversion = convert(rawValue, sourceBase, targetBase);

	if (!conversion.ok) {
		showError(conversion.message);
		return;
	}

	showSingleResult(conversion.result, targetBase);
}

function onClear() {
	form.reset();
	valueInput.classList.remove("invalid");
	hideAll();
	resultPlaceholder.classList.remove("hidden");
	updateHint();
	valueInput.focus();
}

function onSwap() {
	if (targetBaseSelect.value === "all") return;

	const currentSource = sourceBaseSelect.value;
	const currentTarget = targetBaseSelect.value;

	sourceBaseSelect.value = currentTarget;
	targetBaseSelect.value = currentSource;

	updateHint();
}

function updateHint() {
	const base = Number(sourceBaseSelect.value);
	digitsHint.textContent = `dígitos aceitos: ${ACCEPTED_DIGITS[base]}`;
}

async function onCopy() {
	const text = outputValue.textContent;
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		const tempArea = document.createElement("textarea");
		tempArea.value = text;
		tempArea.style.position = "fixed";
		tempArea.style.opacity = "0";
		document.body.appendChild(tempArea);
		tempArea.select();
		document.execCommand("copy");
		document.body.removeChild(tempArea);
	}
	copyButton.textContent = "copiado";
	copyButton.classList.add("copied");
}

form.addEventListener("submit", onSubmit);
clearButton.addEventListener("click", onClear);
swapButton.addEventListener("click", onSwap);
copyButton.addEventListener("click", onCopy);
sourceBaseSelect.addEventListener("change", updateHint);
valueInput.addEventListener("input", () =>
	valueInput.classList.remove("invalid"),
);

updateHint();
