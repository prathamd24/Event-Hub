import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

export default function TermsOfService() {
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
                            <FileText className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-white tracking-tight">Terms of Service</h1>
                            <p className="text-slate-400 mt-2">Effective Date: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
                            <p>
                                By accessing and using Event Hub, you accept and agree to be bound by the terms and provision of this agreement. 
                                In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">2. User Accounts & Responsibilities</h2>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>You must provide accurate and complete information when creating an account.</li>
                                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                                <li>Platform Administrators and College Coordinators hold the right to revoke access or ban accounts violating platform guidelines.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">3. Event Registrations & Payments</h2>
                            <p>
                                Event Hub facilitates the listing and discovering of college events. Payments strictly occur directly between 
                                the student and the event organizer (College/Club) through external gateway applications (e.g. UPI). 
                                Event Hub is not responsible for refund mediation or direct transaction handling.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">4. User-Generated Content</h2>
                            <p>
                                Coordinators and Students may post text, images, and other content ("User Content"). 
                                By posting User Content on Event Hub, you represent and warrant that you hold the right to such content 
                                and that it does not violate any third-party rights or community standards.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white">5. Termination</h2>
                            <p>
                                We may terminate or suspend access to our Service immediately, without prior notice or liability, 
                                for any reason whatsoever, including without limitation if you breach the Terms. 
                                All provisions of the Terms which by their nature should survive termination shall survive termination.
                            </p>
                        </section>
                        
                        <div className="mt-12 p-6 bg-slate-800/50 rounded-2xl border border-white/5">
                            <p className="text-sm text-slate-400">
                                These Terms constitute the entire agreement between us regarding our Service, and supersede and replace 
                                any prior agreements we might have between us regarding the Service.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
