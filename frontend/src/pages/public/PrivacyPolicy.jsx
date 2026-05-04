import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#020617] text-slate-200">
            <Navbar />
            
            <main className="max-w-4xl mx-auto px-6 py-24 min-h-screen">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="flex items-center gap-4 border-b border-white/10 pb-8">
                        <div className="p-4 bg-indigo-500/20 rounded-2xl">
                            <Shield className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-white tracking-tight">Privacy Policy</h1>
                            <p className="text-slate-400 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
                            <p>
                                Welcome to Event Hub. We respect your privacy and are committed to protecting your personal data. 
                                This privacy policy will inform you as to how we look after your personal data when you visit our website 
                                and tell you about your privacy rights.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">2. The Data We Collect</h2>
                            <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li><strong className="text-slate-300">Identity Data:</strong> includes first name, last name, username, and profile metadata linked to your Google/Firebase authentication.</li>
                                <li><strong className="text-slate-300">Contact Data:</strong> includes email address.</li>
                                <li><strong className="text-slate-300">Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version via our platform telemetry metrics.</li>
                                <li><strong className="text-slate-300">Profile Data:</strong> includes your academic college affiliation, club memberships, event registrations, and submitted feedback.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">3. How We Use Your Data</h2>
                            <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>To register you as a new user on our platform.</li>
                                <li>To manage event registrations and team formations.</li>
                                <li>To process and deliver college administration features.</li>
                                <li>To use data analytics to improve our website, products/services, marketing, and user relationships.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">4. Data Security</h2>
                            <p>
                                We have put in place appropriate security measures to prevent your personal data from being accidentally lost, 
                                used or accessed in an unauthorised way, altered or disclosed. Event Hub uses secure Firebase Authentication 
                                for credential management so your core passwords never touch our database.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">5. Cookies</h2>
                            <p>
                                You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies. 
                                Our platform stores minimal local storage tokens purely functional for maintaining your active session across tabs.
                            </p>
                        </section>
                        
                        <div className="mt-12 p-6 bg-slate-800/50 rounded-2xl border border-white/5">
                            <p className="text-sm text-slate-400">
                                If you have any questions about this privacy policy, including any requests to exercise your legal rights, 
                                please contact the Platform Administrator.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
