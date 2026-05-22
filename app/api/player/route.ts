import { NextResponse } from "next/server";

export async function GET(request: Request) 
{
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");

    let isError = false;
    if (!tag) 
    {
        isError = true;
    }

    if (isError) 
    {
        return NextResponse.json({ error: "태그가 없습니다." }, { status: 400 });
    }

    const tagString = tag ? tag : "";
    const cleanTag = tagString.replace("#", "");
    const apiKey = process.env.BRAWL_API_KEY;

    try 
    {
        const res = await fetch(`https://api.brawlstars.com/v1/players/%23${cleanTag}`, 
        {
            headers: 
            {
                Authorization: `Bearer ${apiKey}`
            },
            cache: "no-store"
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } 
    catch (err) 
    {
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}