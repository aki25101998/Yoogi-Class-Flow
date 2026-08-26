import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInvitationEmailParams {
  to: string;
  organizationName: string;
  roleLabel: string;
  invitationUrl: string;
}

export async function sendInvitationEmail({
  to,
  organizationName,
  roleLabel,
  invitationUrl,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const fromEmail = process.env.INVITATION_FROM_EMAIL || 'Yoogi <noreply@yoogi.vn>';
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Bạn được mời tham gia ${organizationName} trên Yoogi`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Lời mời tham gia ${organizationName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f9fafb; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 40px; background-color: #e53e3e; text-align: center;">
                      <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 1px;">YOOGI</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="font-size: 16px; color: #374151; margin-bottom: 24px; line-height: 1.5;">Xin chào,</p>
                      
                      <p style="font-size: 16px; color: #374151; margin-bottom: 24px; line-height: 1.5;">
                        Bạn đã được mời tham gia <strong>${organizationName}</strong> trên nền tảng Yoogi với vai trò: <strong>${roleLabel}</strong>.
                      </p>

                      <p style="font-size: 16px; color: #374151; margin-bottom: 32px; line-height: 1.5;">
                        Lời mời này có hiệu lực trong vòng 7 ngày.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td align="center">
                            <a href="${invitationUrl}" style="display: inline-block; background-color: #e53e3e; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 6px;">
                              Nhận lời mời
                            </a>
                          </td>
                        </tr>
                      </table>

                      <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
                        <p style="font-size: 14px; color: #6b7280; margin: 0; line-height: 1.5;">
                          Nếu bạn không mong đợi email này, bạn có thể an tâm bỏ qua nó.
                        </p>
                        <p style="font-size: 14px; color: #6b7280; margin-top: 8px; line-height: 1.5;">
                          Hoặc copy liên kết sau dán vào trình duyệt:<br>
                          <a href="${invitationUrl}" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">${invitationUrl}</a>
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to send email:', err);
    return { success: false, error: err.message || 'Lỗi không xác định khi gửi email' };
  }
}
