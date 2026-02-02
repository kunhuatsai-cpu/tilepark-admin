export const verifyPassword = async (inputPassword) => {
    const clean = inputPassword.trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(clean);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    // console.log("Checking:", hashHex, import.meta.env.VITE_APP_PASSWORD_HASH);
    return hashHex === import.meta.env.VITE_APP_PASSWORD_HASH;
};
