import type { z } from "zod";
export declare const messageRoleSchema: z.ZodEnum<{
    user: "user";
    assistant: "assistant";
    system: "system";
}>;
export declare const baseMessageSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<{
        user: "user";
        assistant: "assistant";
        system: "system";
    }>;
    createdAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const textMessageContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, z.core.$strip>;
export declare const markdownMessageContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"markdown">;
    markdown: z.ZodString;
}, z.core.$strip>;
export declare const mediaMessageContentSchema: z.ZodObject<{
    type: z.ZodEnum<{
        file: "file";
        image: "image";
        video: "video";
        audio: "audio";
    }>;
    url: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    sizeBytes: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const buttonSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    value: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const cardMessageContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"card">;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        value: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const carouselMessageContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"carousel">;
    items: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodString>;
        buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const quickRepliesMessageContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"quick_replies">;
    text: z.ZodString;
    replies: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        value: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const tableMessageContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"table">;
    columns: z.ZodArray<z.ZodString>;
    rows: z.ZodArray<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const formFieldSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    inputType: z.ZodEnum<{
        number: "number";
        date: "date";
        email: "email";
        text: "text";
        tel: "tel";
        textarea: "textarea";
    }>;
    required: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const formMessageContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"form">;
    title: z.ZodString;
    fields: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        inputType: z.ZodEnum<{
            number: "number";
            date: "date";
            email: "email";
            text: "text";
            tel: "tel";
            textarea: "textarea";
        }>;
        required: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    submitLabel: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const locationMessageContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"location">;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    label: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const statusMessageContentSchema: z.ZodObject<{
    type: z.ZodEnum<{
        error: "error";
        system: "system";
        typing: "typing";
    }>;
    text: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const calendarMessageContentSchema: z.ZodObject<{
    type: z.ZodLiteral<"calendar">;
    title: z.ZodString;
    availableSlots: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const messageContentSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"markdown">;
    markdown: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodEnum<{
        file: "file";
        image: "image";
        video: "video";
        audio: "audio";
    }>;
    url: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    sizeBytes: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"card">;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        value: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"carousel">;
    items: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodString>;
        buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"quick_replies">;
    text: z.ZodString;
    replies: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        value: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"table">;
    columns: z.ZodArray<z.ZodString>;
    rows: z.ZodArray<z.ZodArray<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"form">;
    title: z.ZodString;
    fields: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        inputType: z.ZodEnum<{
            number: "number";
            date: "date";
            email: "email";
            text: "text";
            tel: "tel";
            textarea: "textarea";
        }>;
        required: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    submitLabel: z.ZodDefault<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"location">;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    label: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodEnum<{
        error: "error";
        system: "system";
        typing: "typing";
    }>;
    text: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"calendar">;
    title: z.ZodString;
    availableSlots: z.ZodArray<z.ZodString>;
}, z.core.$strip>], "type">;
export declare const chatMessageSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<{
        user: "user";
        assistant: "assistant";
        system: "system";
    }>;
    createdAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    content: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"markdown">;
        markdown: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodEnum<{
            file: "file";
            image: "image";
            video: "video";
            audio: "audio";
        }>;
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        mimeType: z.ZodOptional<z.ZodString>;
        sizeBytes: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"card">;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodString>;
        buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"carousel">;
        items: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            imageUrl: z.ZodOptional<z.ZodString>;
            buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                value: z.ZodOptional<z.ZodString>;
                url: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"quick_replies">;
        text: z.ZodString;
        replies: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"table">;
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"form">;
        title: z.ZodString;
        fields: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            inputType: z.ZodEnum<{
                number: "number";
                date: "date";
                email: "email";
                text: "text";
                tel: "tel";
                textarea: "textarea";
            }>;
            required: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>;
        submitLabel: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"location">;
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        label: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodEnum<{
            error: "error";
            system: "system";
            typing: "typing";
        }>;
        text: z.ZodOptional<z.ZodString>;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"calendar">;
        title: z.ZodString;
        availableSlots: z.ZodArray<z.ZodString>;
    }, z.core.$strip>], "type">;
}, z.core.$strip>;
export type MessageRole = z.infer<typeof messageRoleSchema>;
export type MessageContent = z.infer<typeof messageContentSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
//# sourceMappingURL=messages.d.ts.map