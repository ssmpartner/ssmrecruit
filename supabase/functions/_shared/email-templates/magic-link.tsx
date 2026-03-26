/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Ihr Login-Link für {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Ihr Login-Link</Heading>
        <Text style={text}>
          Klicken Sie auf die Schaltfläche, um sich bei {siteName} anzumelden.
          Dieser Link ist nur kurze Zeit gültig.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Anmelden
        </Button>
        <Text style={footer}>
          Falls Sie diesen Link nicht angefordert haben, können Sie diese E-Mail ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(0, 0%, 12%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(0, 0%, 45%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: 'hsl(168, 17%, 23%)',
  color: 'hsl(60, 10%, 95%)',
  fontSize: '14px',
  borderRadius: '0.75rem',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: 'hsl(0, 0%, 60%)', margin: '30px 0 0' }
