import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface RHInvitationEmailProps {
  name: string;
  inviteLink: string;
  companyName: string;
  password?: string;
}


export const RHInvitationEmail = ({
  name,
  inviteLink,
  companyName,
  password,
}: RHInvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>You have been invited to join {companyName}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Join <strong>{companyName}</strong> on CV Matcher
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {name},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              You have been invited to join the <strong>{companyName}</strong>{" "}
              team as a Recruiter (RH). Click the button below to set up your
              account and password.
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={inviteLink}
              >
                Accept Invitation
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              or copy and paste this URL into your browser:{" "}
              <span className="text-blue-600">{inviteLink}</span>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default RHInvitationEmail;


