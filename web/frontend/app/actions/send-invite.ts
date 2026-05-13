"use server";

import { Resend } from "resend";
import { RHInvitationEmail } from "@/components/emails/RHInvitationEmail";
import { render } from "@react-email/render";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail(
  email: string,
  name: string,
  companyName: string,
  password?: string // Added password parameter
) {
  try {
    // Point to the sign-in page since the password is provided
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/signin`;

    const emailHtml = await render(
      RHInvitationEmail({
        name,
        companyName,
        inviteLink,
        password, // Pass password to email template
      })
    );

    const { data, error } = await resend.emails.send({
      from: "CV Matcher <onboarding@resend.dev>", // Update this with your verified domain
      to: [email],
      subject: `Invitation to join ${companyName} on CV Matcher`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: "Failed to send email" };
  }
}