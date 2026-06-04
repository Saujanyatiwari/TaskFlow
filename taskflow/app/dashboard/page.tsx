"use client";
import Navbar from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBoards } from "@/lib/hooks/useBoards";
import { useUser } from "@clerk/nextjs";
import { Filter, Ghost, Grid3X3, List, Loader2, Plus, Rocket, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function DashboardPage() {
    const {user} = useUser();
    const {createBoard , boards , loading , error} = useBoards();
    const[viewMode , setViewMode] = useState<"grid" | "list">("grid");

    const handleCreateBoard = async () =>{
        await createBoard({title:"New Board"});
    }

    if(loading){
        return(
            <div>
                <Loader2/>
                <span>Loading you boards...</span>
            </div>
        );
    }

     if(error){
        return(
            <div>
                <h2>Error Loading Boards</h2>
                <p>{error}</p>
            </div>
        );
    }



    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar/>

            <main className="container mx-auto px-4 py-6 sm:py-8">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                        Welcome back , {user?.firstName ?? user?.emailAddresses[0]?.emailAddress}! 👋
                    </h1>
                    <p className="text-gray-600">
                        Here's what's happening with your boards today.
                    </p>
                    <Button className="w-full s:w-auto" onClick={handleCreateBoard}>
                        <Plus className="h-4 w-4 mr-2"/>
                        Create Board
                    </Button>
                </div>
                {/* Stats * */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8  ">
                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="display-flex item-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                                        Total Boards</p>
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                        {boards.length}</p>
                                </div>
                                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <div className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 "></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="display-flex item-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                                        Active Projects</p>
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                        {boards.length}</p>
                                </div>
                                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="display-flex item-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                                        Recent Activity</p>
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                        {boards.filter((board) => {
                                            const updatedAt = new Date(board.updated_at);
                                            const oneWeekAgo = new Date();
                                            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                                            return updatedAt > oneWeekAgo;
                                        }).length}</p>
                                </div>
                                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                📊
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="display-flex item-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                                        Total Boards</p>
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                        {boards.length}</p>
                                </div>
                                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <div className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 "></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    
                </div>

                {/* Boards */}

                <div className=" mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                                Your Boards</h2>
                            <p className="text-gray-600">
                                Manage your projects and tasks</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0">
                            <div className="flex items-center space-x-2 bg-white border p-1">
                                <Button variant={viewMode === "grid" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("grid")}>
                                    <Grid3X3/>
                                </Button>
                                <Button variant={viewMode === "list" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("list")}>
                                    <List/>
                                </Button>
                            </div>

                            <Button variant="outline" size="sm" >
                                <Filter/>
                                Filter
                            </Button>

                            <Button onClick={handleCreateBoard}>
                                <Plus/>
                                Create Board
                            </Button>
                        </div>
                    </div>

                    {/* Serach Bar * */}

                    <div className="relative mb-4 sm:mb-6">
                        <Search className="absolute left-3 top-1/2 transform -translate-1/2 h-4 w-4 text-gray-400"/>
                        <Input id="search" 
                        placeholder="Search boards..." 
                        className="pl-10"/>
                    </div>


                    {/* Boards Grid/List */}

                    {boards.length === 0 ? (
                        <div>No boards yet</div>
                    ) : viewMode === "grid" ? (

                        //grid view

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg-grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {boards.map((board ,key) => (
                            <Link href={`/boards/${board.id}`} key={key}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                                    <CardHeader className="pb-3 ">
                                        <div className="flex items-center justify-between">
                                            <div className= {`w-4 h-4 ${board.color} rounded`}/>
                                            <Badge className="text-xs" variant="secondary">New</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-6">
                                        <CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
                                            {board.title}
                                        </CardTitle>
                                        <CardDescription className="text-sm mb-4">
                                            {board.description}</CardDescription>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
                                            <span>
                                                Created{" "}
                                                {new Date(board.created_at).toLocaleDateString()}   
                                            </span>
                                            <span>
                                                Updated{" "}
                                                {new Date(board.updated_at).toLocaleDateString()}   
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}

                        <Card className="border-2 border-dashed borger-gray-300 hover:border-blue-400 transition-colors cursor-pointer group">
                            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-50">
                                <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-2"/>
                                <p className="text-sm sm:text-base text-gray-600 group-hover:text-blue-600 font-medium">Create new board</p>
                            </CardContent>
                        </Card>
                    </div>

                    ) : (
                        //list view
                    <div>
                        {boards.map((board ,key) => (
                            <div key={key} className={key > 0 ? "mt-4" :""}>
                            <Link href={`/boards/${board.id}`} key={key}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                                    <CardHeader className="pb-3 ">
                                        <div className="flex items-center justify-between">
                                            <div className= {`w-4 h-4 ${board.color} rounded`}/>
                                            <Badge className="text-xs" variant="secondary">New</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-6">
                                        <CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
                                            {board.title}
                                        </CardTitle>
                                        <CardDescription className="text-sm mb-4">
                                            {board.description}</CardDescription>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
                                            <span>
                                                Created{" "}
                                                {new Date(board.created_at).toLocaleDateString()}   
                                            </span>
                                            <span>
                                                Updated{" "}
                                                {new Date(board.updated_at).toLocaleDateString()}   
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                            </div>
                        ))}

                        <Card className="mt-4 border-2 border-dashed borger-gray-300 hover:border-blue-400 transition-colors cursor-pointer group">
                            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
                                <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-2"/>
                                <p className="text-sm sm:text-base text-gray-600 group-hover:text-blue-600 font-medium">Create new board</p>
                            </CardContent>
                        </Card>
                    </div>

                    )}
                </div>
            </main>
        </div>
    )
}