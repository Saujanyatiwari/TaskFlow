"use client";

import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SignUpButton, useUser } from "@clerk/nextjs";
import {
    ArrowRight,
    Calendar,
    CheckCircle2,
    GripVertical,
    Layers,
    LayoutDashboard,
    Shield,
    Zap,
} from "lucide-react";
import Link from "next/link";

const FEATURES = [
    {
        icon: <LayoutDashboard className="h-6 w-6 text-blue-600" />,
        title: "Drag & Drop Kanban",
        description: "Move tasks between columns with smooth, intuitive drag-and-drop.",
    },
    {
        icon: <Zap className="h-6 w-6 text-yellow-500" />,
        title: "Task Prioritization",
        description: "Mark tasks as low, medium, or high priority to keep focus on what matters.",
    },
    {
        icon: <Calendar className="h-6 w-6 text-green-500" />,
        title: "Due Date Tracking",
        description: "Set deadlines and filter tasks by date range so nothing slips through.",
    },
    {
        icon: <Layers className="h-6 w-6 text-purple-500" />,
        title: "Multiple Boards",
        description: "Organize separate projects on their own dedicated boards.",
    },
    {
        icon: <Shield className="h-6 w-6 text-rose-500" />,
        title: "Secure & Persistent",
        description: "Data stored safely in Supabase with Clerk-powered authentication.",
    },
];

const PREVIEW_COLUMNS = [
    {
        title: "To Do",
        bg: "bg-gray-50",
        tasks: [
            { title: "Design landing page", priority: "high", tag: "Design" },
            { title: "Set up CI/CD", priority: "medium", tag: "DevOps" },
        ],
    },
    {
        title: "In Progress",
        bg: "bg-blue-50",
        tasks: [
            { title: "Build auth flow", priority: "high", tag: "Backend" },
            { title: "Write unit tests", priority: "low", tag: "Testing" },
        ],
    },
    {
        title: "Done",
        bg: "bg-green-50",
        tasks: [{ title: "Initialize project", priority: "low", tag: "Setup" }],
    },
];

const PRIORITY_DOT: Record<string, string> = {
    high: "bg-red-400",
    medium: "bg-yellow-400",
    low: "bg-green-400",
};

export default function Home() {
    const { isSignedIn } = useUser();

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero */}
            <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20 sm:py-28">
                <div className="container mx-auto px-4 text-center max-w-3xl">
                    <span className="inline-block mb-5 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
                        Free to start · No credit card required
                    </span>
                    <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                        Organize tasks, boards,
                        <br className="hidden sm:block" /> and workflows{" "}
                        <span className="text-blue-600">effortlessly</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-xl mx-auto">
                        TaskFlow is a modern kanban board that helps you manage projects, track
                        priorities, and ship faster — all in one clean workspace.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        {isSignedIn ? (
                            <Link href="/dashboard">
                                <Button size="lg" className="px-8 text-base">
                                    Go to Dashboard
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        ) : (
                            <SignUpButton>
                                <Button size="lg" className="px-8 text-base">
                                    Get Started Free
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </SignUpButton>
                        )}
                    </div>
                </div>
            </section>

            {/* Kanban Preview */}
            <section className="py-16 sm:py-20 bg-white">
                <div className="container mx-auto px-4">
                    <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
                        A glimpse of your workspace
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-4 max-w-3xl mx-auto">
                        {PREVIEW_COLUMNS.map((col) => (
                            <div
                                key={col.title}
                                className={`flex-shrink-0 w-52 rounded-xl ${col.bg} p-3 border border-gray-100`}
                            >
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                                    {col.title}
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {col.tasks.map((task) => (
                                        <div
                                            key={task.title}
                                            className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex flex-col gap-2"
                                        >
                                            <div className="flex items-start gap-2">
                                                <span
                                                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`}
                                                />
                                                <span className="text-sm font-medium text-gray-800 leading-snug flex-1">
                                                    {task.title}
                                                </span>
                                                <GripVertical className="h-3 w-3 text-gray-300 shrink-0 mt-0.5" />
                                            </div>
                                            <span className="text-xs text-gray-400 bg-gray-50 rounded px-2 py-0.5 w-fit">
                                                {task.tag}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-16 sm:py-20 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                            Everything you need to stay organized
                        </h2>
                        <p className="text-gray-500 max-w-xl mx-auto">
                            Built for individuals and teams who want clarity without complexity.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-5 max-w-5xl mx-auto">
                        {FEATURES.map((f) => (
                            <div key={f.title} className="w-full sm:w-[280px]">
                                <Card className="h-full border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <CardContent className="p-6">
                                        <div className="mb-4">{f.icon}</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                                        <p className="text-sm text-gray-500">{f.description}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Teaser */}
            <section className="py-16 sm:py-20 bg-white">
                <div className="container mx-auto px-4 max-w-2xl text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                        Simple pricing
                    </h2>
                    <p className="text-gray-500 mb-10">Start free. Upgrade when you're ready.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left mb-10">
                        <Card className="border-2 border-gray-200">
                            <CardContent className="p-6">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                                    Free
                                </p>
                                <p className="text-4xl font-extrabold text-gray-900 mb-5">
                                    $0{" "}
                                    <span className="text-base font-normal text-gray-400">/mo</span>
                                </p>
                                <ul className="space-y-2.5 text-sm text-gray-600">
                                    {[
                                        "Up to 3 boards",
                                        "Unlimited tasks",
                                        "Drag & drop kanban",
                                        "Priority & date filters",
                                    ].map((item) => (
                                        <li key={item} className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-blue-400 bg-blue-50">
                            <CardContent className="p-6">
                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
                                    Pro
                                </p>
                                <p className="text-4xl font-extrabold text-gray-900 mb-5">
                                    $9{" "}
                                    <span className="text-base font-normal text-gray-400">/mo</span>
                                </p>
                                <ul className="space-y-2.5 text-sm text-gray-600">
                                    {[
                                        "Unlimited boards",
                                        "Team collaboration",
                                        "Advanced analytics",
                                        "Priority support",
                                    ].map((item) => (
                                        <li key={item} className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                    <Link href="/pricing">
                        <Button size="lg" variant="outline" className="px-8">
                            View full pricing
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-gray-50 py-8">
                <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                    <span className="font-bold text-gray-800 text-base">TaskFlow</span>
                    <span>© {new Date().getFullYear()} TaskFlow. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}
