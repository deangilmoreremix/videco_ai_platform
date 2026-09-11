// Stack-only: Supabase + Muapi + OpenAI
// No Cloudinary, no Brevo, no Stripe. Embeds are plain iframe/video tags.

export const emailProvidersList = () => [
    { value: "html", label: "HTML", description: "Plain HTML embed code" },
    {
        value: "mjml",
        label: "MJML",
        description: "MJML markup for email clients",
    },
];

const mailchimp = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
  <a href="{{url}}" style="display: inline-block;">
    <img width="360px" src="{{gifUrl}}" alt="Watch the video" style="display: block; background: white; border-radius: 30px;" />
    <br />
    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
  </a>
</div>`;

const woodpecker = mailchimp;

export const getEmailEmbedCode = (
    url: string,
    og_url: string,
    provider: string,
    fname: string,
) => {
    const gifUrl = (function () {
        try {
            const { getGifPreviewUrl } =
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require("src/utils/media");
            return getGifPreviewUrl(og_url);
        } catch (e) {
            return "/default_thumb.png";
        }
    })();

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

    const hubspot = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
<a href="${url}?fname={{contact.firstname}}&lname={{contact.lastname}}&ai_email={{contact.email}}" style="display: inline-block;">
    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
    <br />
    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
</a>
</div>`;

    const aweber = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
        <a href="${url}?fname={{subscriber.firstname}}&lname={{subscriber.lastname}}" style="display: inline-block;">
            <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
            <br />
            <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
        </a>
        </div>`;

    const apollo = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname={{first_name}}&lname={{last_name}}" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;

    const smartlead = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname={{first_name}}&lname={{last_name}}" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;

    const lemlist = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname={{firstName}}&lname={{lastName}}" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;

    const gohighlevel = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname={{contact.name}}&lname={{contact.last_name}}" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;
    const lagrowthmachine = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname={{firstname}}&lname={{lastname}}" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;

    const salesflow = `We made a video for you:  ${url}?fname={first_name}&lname={last_name}&ai_email={custom_variable_1|fallback@videco.io}`;

    const activecampaign = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname=%FNAME%&lname=%LNAME%" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;
    const other = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname=%FNAME%&lname=%LNAME%" style="display: inline-block;  background: white;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;

    if (provider === "mailchimp") {
        return mailchimp;
    }
    if (provider === "nethunt") {
        return nethunt;
    }

    if (provider === "smartlead") {
        return smartlead;
    }

    if (provider === "woodpecker") {
        return woodpecker;
    }

    if (provider === "lemlist") {
        return lemlist;
    }

    if (provider === "hubspot") {
        return hubspot;
    }

    if (provider === "apollo") {
        return apollo;
    }

    if (provider === "aweber") {
        return aweber;
    }

    if (provider === "activecampaign") {
        return activecampaign;
    }

    if (provider === "salesflow") {
        return salesflow;
    }

    if (provider === "gohighlevel") {
        return gohighlevel;
    }

    if (provider === "lagrowthmachine") {
        return lagrowthmachine;
    }

    if (provider === "other") {
        return other;
    }

    return mailchimp;
};

export const getEmailEmbedCodeForSimpleVideos = (
    url: string,
    og_url: string,
    provider: string,
    fname: string,
) => {
    const gifUrl = (function () {
        try {
            const { getGifPreviewUrl } =
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require("src/utils/media");
            return getGifPreviewUrl(og_url);
        } catch (e) {
            return "/default_thumb.png";
        }
    })();

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

    const hubspot = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
<a href="${url}?fname={{contact.firstname}}&lname={{contact.lastname}}" style="display: inline-block;">
    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
    <br />
    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
</a>
</div>`;

    const aweber = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
        <a href="${url}?fname={{subscriber.firstname}}&lname={{subscriber.lastname}}" style="display: inline-block;">
            <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
            <br />
            <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
        </a>
        </div>`;

    const apollo = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname={{first_name}}&lname={{last_name}}" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;

    const smartlead = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname={{first_name}}&lname={{last_name}}" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;

    const lemlist = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname={{firstName}}&lname={{lastName}}" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;

    const gohighlevel = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname={{contact.name}}&lname={{contact.last_name}}" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;
    const lagrowthmachine = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname={{firstname}}&lname={{lastname}}" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;

    const salesflow = `We made a video for you:  ${url}?fname={first_name}&lname={last_name}`;

    const activecampaign = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname=%FNAME%&lname=%LNAME%" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;
    const other = `<div style="position: relative; display: inline-block; padding: 5px; background: white;">
                <a href="${url}?fname=%FNAME%&lname=%LNAME%" style="display: inline-block;">
                    <img width="360px" src="${gifUrl}" alt="Watch the video" style="display: block;  background: white; border-radius: 30px;" />
                    <br />
                    <span style="display: block; font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.4;">Watch the video ▶</span>
                </a>
            </div>`;

    if (provider === "mailchimp") {
        return mailchimp;
    }

    if (provider === "smartlead") {
        return smartlead;
    }

    if (provider === "woodpecker") {
        return woodpecker;
    }

    if (provider === "lemlist") {
        return lemlist;
    }

    if (provider === "hubspot") {
        return hubspot;
    }

    if (provider === "apollo") {
        return apollo;
    }

    if (provider === "aweber") {
        return aweber;
    }

    if (provider === "activecampaign") {
        return activecampaign;
    }

    if (provider === "salesflow") {
        return salesflow;
    }

    if (provider === "gohighlevel") {
        return gohighlevel;
    }

    if (provider === "lagrowthmachine") {
        return lagrowthmachine;
    }

    if (provider === "other") {
        return other;
    }

    return mailchimp;
};
