import fs from 'fs';

const content = fs.readFileSync('src/lib/supabaseClient.js');

const cleanContentBuffer = content.slice(0, 23394);
const cleanText = cleanContentBuffer.toString('utf8');

const newFunc = `
export async function isCurrentUserDM() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.email === 'gabrielsantos-2003@hotmail.com';
}
`;

fs.writeFileSync('src/lib/supabaseClient.js', cleanText + newFunc);
console.log("Fixed!");
