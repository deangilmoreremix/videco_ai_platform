// Stack-only: Supabase + Muapi + OpenAI
// No Cloudinary, no Brevo, no Stripe. Embeds are plain iframe/video tags.

export const getEmailEmbedCode = (provider: string, url: string, fname: string, ogUrl: string): string => {
  if (!url) return "";

  if (provider === "html") {
    return `
      <div style="position: relative; display: inline-block; padding: 5px; background: white;">
        <video controls src="${url}" poster="${ogUrl}" style="max-width: 480px; border-radius: 8px;"></video>
        <p style="font-family: Arial; color: #05405A; margin: 0; padding-top: 5px;">${fname}</p>
      </div>
    `;
  }

  if (provider === "mjml") {
    return `
      <mj-section>
        <mj-column>
          <mj-image src="${url}" alt="${fname}" border-radius="8px" />
          <mj-text align="center" color="#05405A">${fname}</mj-text>
        </mj-column>
      </mj-section>
    `;
  }

  return `<video controls src="${url}" poster="${ogUrl}" style="max-width: 480px;"></video>`;
};