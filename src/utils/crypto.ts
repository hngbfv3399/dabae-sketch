const SECRET_KEY = "dabae-sketch-key-2026-secure-token-1284";

/**
 * 대칭 키 기반의 간단하고 견고한 동기식 문자열 암호화 함수.
 * 데이터베이스(Convex) 및 LocalStorage에 텍스트가 직접 저장되는 것을 방지합니다.
 * 한글 및 특수문자 처리를 위해 UTF-8 인코딩을 지원합니다.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  try {
    // 1. UTF-8 문자열을 바이트 형태로 다루기 위해 encodeURIComponent 변환
    const utf8Str = encodeURIComponent(text);
    
    // 2. SECRET_KEY 문자코드를 이용한 간단한 XOR cipher 적용
    let xorResult = "";
    for (let i = 0; i < utf8Str.length; i++) {
      const charCode = utf8Str.charCodeAt(i);
      const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      xorResult += String.fromCharCode(charCode ^ keyChar);
    }
    
    // 3. Base64 인코딩 후 접두사(enc_)를 붙여 저장 형태로 포맷
    return "enc_" + btoa(unescape(encodeURIComponent(xorResult)));
  } catch (e) {
    console.error("Encryption failed, falling back to plaintext:", e);
    return text;
  }
}

/**
 * 암호화된 문자열을 복호화하여 원래의 텍스트로 복원하는 함수.
 * 'enc_' 접두사로 시작하지 않는 레거시 평문 텍스트는 그대로 반환합니다.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  if (!encryptedText.startsWith("enc_")) {
    return encryptedText; // 암호화되지 않은 레거시 데이터 지원
  }
  
  try {
    // 1. 접두사 제거 및 Base64 디코딩
    const base64Str = encryptedText.substring(4);
    const rawXorStr = decodeURIComponent(escape(atob(base64Str)));
    
    // 2. XOR cipher 역산 적용
    let utf8Str = "";
    for (let i = 0; i < rawXorStr.length; i++) {
      const charCode = rawXorStr.charCodeAt(i);
      const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      utf8Str += String.fromCharCode(charCode ^ keyChar);
    }
    
    // 3. URI 디코딩을 통해 원래의 한글/특수문자 텍스트 복구
    return decodeURIComponent(utf8Str);
  } catch (e) {
    console.error("Decryption failed, falling back to cipher text:", e);
    return encryptedText;
  }
}
