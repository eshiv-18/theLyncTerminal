import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card>
          <CardContent className="p-8">
            <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: January 2026</p>

            <div className="space-y-6 text-sm">
              <section>
                <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to Startup Intel ("we," "our," or "us"). We are committed to protecting your personal 
                  information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, 
                  and safeguard your information when you use our Startup Progress Intelligence Platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
                <h3 className="text-lg font-medium mb-2">2.1 Information You Provide</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Account information (name, email, password)</li>
                  <li>Organization details (company name, role)</li>
                  <li>Financial metrics and business data</li>
                  <li>Integration credentials (OAuth tokens)</li>
                  <li>Report content and submissions</li>
                </ul>

                <h3 className="text-lg font-medium mb-2 mt-4">2.2 Automatically Collected Information</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Log data (IP address, browser type, pages visited)</li>
                  <li>Device information</li>
                  <li>Cookies and tracking technologies</li>
                  <li>Usage analytics</li>
                </ul>

                <h3 className="text-lg font-medium mb-2 mt-4">2.3 Third-Party Integration Data</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Financial data from Zoho Books</li>
                  <li>CRM data from HubSpot</li>
                  <li>Project data from Jira</li>
                  <li>Repository data from GitHub</li>
                  <li>Payment data from Razorpay</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Provide and maintain the Platform</li>
                  <li>Generate automated reports and insights</li>
                  <li>Monitor portfolio performance and health metrics</li>
                  <li>Send alerts and notifications</li>
                  <li>Process payments and subscriptions</li>
                  <li>Improve and optimize our services</li>
                  <li>Comply with legal obligations</li>
                  <li>Prevent fraud and ensure security</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">4. Data Sharing and Disclosure</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our Platform (cloud hosting, analytics)</li>
                  <li><strong>Integration Partners:</strong> Services you authorize (Zoho, HubSpot, GitHub, etc.)</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
                  <li><strong>Business Transfers:</strong> In connection with mergers or acquisitions</li>
                  <li><strong>With Your Consent:</strong> Other parties when you explicitly authorize</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement industry-standard security measures including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mt-2">
                  <li>Encryption of data in transit (SSL/TLS)</li>
                  <li>Encryption of data at rest</li>
                  <li>JWT-based authentication</li>
                  <li>Role-based access control (RBAC)</li>
                  <li>Rate limiting and DDoS protection</li>
                  <li>Regular security audits</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">6. Data Retention</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your information for as long as your account is active or as needed to provide services. 
                  You may request deletion of your account and data at any time. We may retain certain information 
                  as required by law or for legitimate business purposes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">7. Your Rights</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Depending on your location, you may have the following rights:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to processing</li>
                  <li>Data portability</li>
                  <li>Withdraw consent</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">8. Cookies and Tracking</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use cookies and similar tracking technologies to track activity and store information. 
                  You can instruct your browser to refuse cookies or indicate when a cookie is being sent.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">9. Third-Party Links</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our Platform may contain links to third-party websites. We are not responsible for the privacy 
                  practices of these external sites. We encourage you to review their privacy policies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">10. Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our Platform is not intended for individuals under 18 years of age. We do not knowingly collect 
                  personal information from children.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">11. International Data Transfers</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your information may be transferred to and processed in countries other than your country of 
                  residence. We ensure appropriate safeguards are in place for such transfers.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">12. Changes to This Privacy Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of material changes by 
                  posting the new policy and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">13. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <div className="mt-3 p-4 bg-muted rounded-lg">
                  <p className="font-medium">Startup Intel</p>
                  <p className="text-muted-foreground">Email: privacy@startupintel.com</p>
                  <p className="text-muted-foreground">Address: [Your Business Address]</p>
                </div>
              </section>

              <section className="border-t pt-6 mt-8">
                <p className="text-xs text-muted-foreground">
                  By using the Startup Progress Intelligence Platform, you acknowledge that you have read and 
                  understood this Privacy Policy and agree to its terms.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
