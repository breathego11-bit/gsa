interface TextContentProps {
    content: string
}

export function TextContent({ content }: TextContentProps) {
    return (
        <div
            className="
                max-w-none text-on-surface leading-relaxed
                [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-on-surface [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:tracking-tight
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-on-surface [&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:tracking-tight
                [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-on-surface [&_h3]:mt-6 [&_h3]:mb-2
                [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-on-surface [&_h4]:mt-5 [&_h4]:mb-2
                [&_p]:text-on-surface-variant [&_p]:mb-4 [&_p]:leading-7
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ul]:text-on-surface-variant
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1.5 [&_ol]:text-on-surface-variant
                [&_li]:leading-7
                [&_a]:text-blue-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary
                [&_blockquote]:border-l-4 [&_blockquote]:border-blue-primary [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:bg-surface-container/50 [&_blockquote]:rounded-r-xl [&_blockquote]:italic [&_blockquote]:text-on-surface-variant
                [&_code]:bg-surface-container-highest [&_code]:text-primary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-sm [&_code]:font-mono
                [&_pre]:bg-surface-container-lowest [&_pre]:border [&_pre]:border-outline-variant [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:my-4 [&_pre]:overflow-x-auto
                [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:py-0 [&_pre_code]:text-on-surface-variant
                [&_strong]:text-on-surface [&_strong]:font-semibold
                [&_em]:italic
                [&_hr]:border-outline-variant [&_hr]:my-6
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
                [&_th]:border [&_th]:border-outline-variant [&_th]:bg-surface-container [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:text-on-surface [&_th]:font-semibold [&_th]:text-sm
                [&_td]:border [&_td]:border-outline-variant [&_td]:px-4 [&_td]:py-2 [&_td]:text-on-surface-variant [&_td]:text-sm
                [&_img]:rounded-xl [&_img]:my-4 [&_img]:max-w-full
            "
            dangerouslySetInnerHTML={{ __html: content }}
        />
    )
}
