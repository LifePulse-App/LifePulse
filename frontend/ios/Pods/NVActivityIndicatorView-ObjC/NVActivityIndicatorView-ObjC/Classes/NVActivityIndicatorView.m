#import "NVActivityIndicatorView.h"

// Import all animation classes
#import "NVActivityIndicatorAnimationBlank.h"
#import "NVActivityIndicatorAnimationBallPulse.h"
#import "NVActivityIndicatorAnimationBallGridPulse.h"
#import "NVActivityIndicatorAnimationBallClipRotate.h"
#import "NVActivityIndicatorAnimationSquareSpin.h"
#import "NVActivityIndicatorAnimationBallClipRotatePulse.h"
#import "NVActivityIndicatorAnimationBallClipRotateMultiple.h"
#import "NVActivityIndicatorAnimationBallPulseRise.h"
#import "NVActivityIndicatorAnimationBallRotate.h"
#import "NVActivityIndicatorAnimationCubeTransition.h"
#import "NVActivityIndicatorAnimationBallZigZag.h"
#import "NVActivityIndicatorAnimationBallZigZagDeflect.h"
#import "NVActivityIndicatorAnimationBallTrianglePath.h"
#import "NVActivityIndicatorAnimationBallScale.h"
#import "NVActivityIndicatorAnimationLineScale.h"
#import "NVActivityIndicatorAnimationLineScaleParty.h"
#import "NVActivityIndicatorAnimationBallScaleMultiple.h"
#import "NVActivityIndicatorAnimationBallPulseSync.h"
#import "NVActivityIndicatorAnimationBallBeat.h"
#import "NVActivityIndicatorAnimationBallDoubleBounce.h"
#import "NVActivityIndicatorAnimationLineScalePulseOut.h"
#import "NVActivityIndicatorAnimationLineScalePulseOutRapid.h"
#import "NVActivityIndicatorAnimationBallScaleRipple.h"
#import "NVActivityIndicatorAnimationBallScaleRippleMultiple.h"
#import "NVActivityIndicatorAnimationBallSpinFadeLoader.h"
#import "NVActivityIndicatorAnimationLineSpinFadeLoader.h"
#import "NVActivityIndicatorAnimationTriangleSkewSpin.h"
#import "NVActivityIndicatorAnimationPacman.h"
#import "NVActivityIndicatorAnimationBallGridBeat.h"
#import "NVActivityIndicatorAnimationSemiCircleSpin.h"
#import "NVActivityIndicatorAnimationBallRotateChase.h"
#import "NVActivityIndicatorAnimationOrbit.h"
#import "NVActivityIndicatorAnimationAudioEqualizer.h"
#import "NVActivityIndicatorAnimationCircleStrokeSpin.h"

@interface NVActivityIndicatorView ()

@end

@implementation NVActivityIndicatorView

#pragma mark - Class Properties

static NVActivityIndicatorType _defaultType = NVActivityIndicatorTypeBallSpinFadeLoader;
static UIColor *_defaultColor = nil;
static UIColor *_defaultTextColor = nil;
static CGFloat _defaultPadding = 0.0;
static CGFloat _defaultAnimationSpeedMultiplier = 1.0;
static CGSize _defaultBlockerSize = {60, 60};
static NSInteger _defaultBlockerDisplayTimeThreshold = 0;
static NSInteger _defaultBlockerMinimumDisplayTime = 0;
static NSString *_defaultBlockerMessage = nil;
static CGFloat _defaultBlockerMessageSpacing = 8.0;
static UIFont *_defaultBlockerMessageFont = nil;
static UIColor *_defaultBlockerBackgroundColor = nil;
static FadeInAnimation _defaultFadeInAnimation = nil;
static FadeOutAnimation _defaultFadeOutAnimation = nil;

+ (void)initialize {
    if (self == [NVActivityIndicatorView class]) {
        _defaultColor = [UIColor whiteColor];
        _defaultTextColor = [UIColor whiteColor];
        _defaultBlockerMessageFont = [UIFont boldSystemFontOfSize:20];
        _defaultBlockerBackgroundColor = [UIColor colorWithRed:0 green:0 blue:0 alpha:0.5];
        
        _defaultFadeInAnimation = ^(UIView *view) {
            view.alpha = 0;
            [UIView animateWithDuration:0.25 animations:^{
                view.alpha = 1;
            }];
        };
        
        _defaultFadeOutAnimation = ^(UIView *view, void (^completion)(void)) {
            [UIView animateWithDuration:0.25 animations:^{
                view.alpha = 0;
            } completion:^(BOOL finished) {
                if (finished && completion) {
                    completion();
                }
            }];
        };
    }
}

+ (NVActivityIndicatorType)defaultType {
    return _defaultType;
}

+ (void)setDefaultType:(NVActivityIndicatorType)defaultType {
    _defaultType = defaultType;
}

+ (UIColor *)defaultColor {
    return _defaultColor;
}

+ (void)setDefaultColor:(UIColor *)defaultColor {
    _defaultColor = defaultColor;
}

+ (UIColor *)defaultTextColor {
    return _defaultTextColor;
}

+ (void)setDefaultTextColor:(UIColor *)defaultTextColor {
    _defaultTextColor = defaultTextColor;
}

+ (CGFloat)defaultPadding {
    return _defaultPadding;
}

+ (void)setDefaultPadding:(CGFloat)defaultPadding {
    _defaultPadding = defaultPadding;
}

+ (CGFloat)defaultAnimationSpeedMultiplier {
    return _defaultAnimationSpeedMultiplier;
}

+ (void)setDefaultAnimationSpeedMultiplier:(CGFloat)defaultAnimationSpeedMultiplier {
    _defaultAnimationSpeedMultiplier = defaultAnimationSpeedMultiplier;
}

+ (CGSize)defaultBlockerSize {
    return _defaultBlockerSize;
}

+ (void)setDefaultBlockerSize:(CGSize)defaultBlockerSize {
    _defaultBlockerSize = defaultBlockerSize;
}

+ (NSInteger)defaultBlockerDisplayTimeThreshold {
    return _defaultBlockerDisplayTimeThreshold;
}

+ (void)setDefaultBlockerDisplayTimeThreshold:(NSInteger)defaultBlockerDisplayTimeThreshold {
    _defaultBlockerDisplayTimeThreshold = defaultBlockerDisplayTimeThreshold;
}

+ (NSInteger)defaultBlockerMinimumDisplayTime {
    return _defaultBlockerMinimumDisplayTime;
}

+ (void)setDefaultBlockerMinimumDisplayTime:(NSInteger)defaultBlockerMinimumDisplayTime {
    _defaultBlockerMinimumDisplayTime = defaultBlockerMinimumDisplayTime;
}

+ (NSString *)defaultBlockerMessage {
    return _defaultBlockerMessage;
}

+ (void)setDefaultBlockerMessage:(NSString *)defaultBlockerMessage {
    _defaultBlockerMessage = defaultBlockerMessage;
}

+ (CGFloat)defaultBlockerMessageSpacing {
    return _defaultBlockerMessageSpacing;
}

+ (void)setDefaultBlockerMessageSpacing:(CGFloat)defaultBlockerMessageSpacing {
    _defaultBlockerMessageSpacing = defaultBlockerMessageSpacing;
}

+ (UIFont *)defaultBlockerMessageFont {
    return _defaultBlockerMessageFont;
}

+ (void)setDefaultBlockerMessageFont:(UIFont *)defaultBlockerMessageFont {
    _defaultBlockerMessageFont = defaultBlockerMessageFont;
}

+ (UIColor *)defaultBlockerBackgroundColor {
    return _defaultBlockerBackgroundColor;
}

+ (void)setDefaultBlockerBackgroundColor:(UIColor *)defaultBlockerBackgroundColor {
    _defaultBlockerBackgroundColor = defaultBlockerBackgroundColor;
}

+ (FadeInAnimation)defaultFadeInAnimation {
    return _defaultFadeInAnimation;
}

+ (void)setDefaultFadeInAnimation:(FadeInAnimation)defaultFadeInAnimation {
    _defaultFadeInAnimation = [defaultFadeInAnimation copy];
}

+ (FadeOutAnimation)defaultFadeOutAnimation {
    return _defaultFadeOutAnimation;
}

+ (void)setDefaultFadeOutAnimation:(FadeOutAnimation)defaultFadeOutAnimation {
    _defaultFadeOutAnimation = [defaultFadeOutAnimation copy];
}

#pragma mark - Initializers

- (instancetype)initWithCoder:(NSCoder *)aDecoder {
    self = [super initWithCoder:aDecoder];
    if (self) {
        self.backgroundColor = [UIColor clearColor];
        self.type = [NVActivityIndicatorView defaultType];
        self.color = [NVActivityIndicatorView defaultColor];
        self.padding = [NVActivityIndicatorView defaultPadding];
        self.animationSpeedMultiplier = [NVActivityIndicatorView defaultAnimationSpeedMultiplier];
    }
    return self;
}

- (instancetype)initWithFrame:(CGRect)frame
                         type:(NVActivityIndicatorType)type
                        color:(UIColor *)color
                      padding:(CGFloat)padding {
    self = [super initWithFrame:frame];
    if (self) {
        self.type = type;
        self.color = color ?: [NVActivityIndicatorView defaultColor];
        self.padding = padding;
        self.animationSpeedMultiplier = [NVActivityIndicatorView defaultAnimationSpeedMultiplier];
        self.backgroundColor = [UIColor clearColor];
    }
    return self;
}

- (instancetype)initWithFrame:(CGRect)frame
                         type:(NVActivityIndicatorType)type
                        color:(UIColor *)color
                      padding:(CGFloat)padding
       animationSpeedMultiplier:(CGFloat)animationSpeedMultiplier {
    self = [super initWithFrame:frame];
    if (self) {
        self.type = type;
        self.color = color ?: [NVActivityIndicatorView defaultColor];
        self.padding = padding;
        self.animationSpeedMultiplier = animationSpeedMultiplier;
        self.backgroundColor = [UIColor clearColor];
    }
    return self;
}

- (instancetype)initWithFrame:(CGRect)frame
                         type:(NVActivityIndicatorType)type
                        color:(UIColor *)color {
    return [self initWithFrame:frame type:type color:color padding:[NVActivityIndicatorView defaultPadding]];
}

- (instancetype)initWithFrame:(CGRect)frame
                         type:(NVActivityIndicatorType)type {
    return [self initWithFrame:frame type:type color:[NVActivityIndicatorView defaultColor] padding:[NVActivityIndicatorView defaultPadding]];
}

- (instancetype)initWithFrame:(CGRect)frame {
    return [self initWithFrame:frame type:[NVActivityIndicatorView defaultType] color:[NVActivityIndicatorView defaultColor] padding:[NVActivityIndicatorView defaultPadding]];
}

#pragma mark - UIView Overrides

- (CGSize)intrinsicContentSize {
    return CGSizeMake(self.bounds.size.width, self.bounds.size.height);
}

- (void)setBounds:(CGRect)bounds {
    CGRect oldBounds = self.bounds;
    [super setBounds:bounds];
    
    if (!CGRectEqualToRect(oldBounds, bounds) && !CGSizeEqualToSize(bounds.size, CGSizeZero)) {
        [self setUpAnimation];
    }
}

/*
    * Called when the view is added to or removed from a parent view
    * Good for initial setup when the view is first displayed
    * One-time trigger when view hierarchy changes
    */
- (void)didMoveToSuperview {
    [super didMoveToSuperview];
    if (self.superview && !CGSizeEqualToSize(self.bounds.size, CGSizeZero)) {
        [self setUpAnimation];
    }
}

/*
    * Called when the view's bounds change (size, rotation, constraints update, etc.)
    * Essential for handling dynamic resizing, device rotation, constraint changes
    * Multiple triggers throughout the view's lifecycle
    */
- (void)layoutSubviews {
    [super layoutSubviews];
    if (!CGSizeEqualToSize(self.bounds.size, CGSizeZero)) {
        [self setUpAnimation];
    }
}

+ (id<NVActivityIndicatorAnimationDelegate>)animationForType:(NVActivityIndicatorType)type {
    switch (type) {
        case NVActivityIndicatorTypeBlank:
            return [[NVActivityIndicatorAnimationBlank alloc] init];
        case NVActivityIndicatorTypeBallPulse:
            return [[NVActivityIndicatorAnimationBallPulse alloc] init];
        case NVActivityIndicatorTypeBallGridPulse:
            return [[NVActivityIndicatorAnimationBallGridPulse alloc] init];
        case NVActivityIndicatorTypeBallClipRotate:
            return [[NVActivityIndicatorAnimationBallClipRotate alloc] init];
        case NVActivityIndicatorTypeSquareSpin:
            return [[NVActivityIndicatorAnimationSquareSpin alloc] init];
        case NVActivityIndicatorTypeBallClipRotatePulse:
            return [[NVActivityIndicatorAnimationBallClipRotatePulse alloc] init];
        case NVActivityIndicatorTypeBallClipRotateMultiple:
            return [[NVActivityIndicatorAnimationBallClipRotateMultiple alloc] init];
        case NVActivityIndicatorTypeBallPulseRise:
            return [[NVActivityIndicatorAnimationBallPulseRise alloc] init];
        case NVActivityIndicatorTypeBallRotate:
            return [[NVActivityIndicatorAnimationBallRotate alloc] init];
        case NVActivityIndicatorTypeCubeTransition:
            return [[NVActivityIndicatorAnimationCubeTransition alloc] init];
        case NVActivityIndicatorTypeBallZigZag:
            return [[NVActivityIndicatorAnimationBallZigZag alloc] init];
        case NVActivityIndicatorTypeBallZigZagDeflect:
            return [[NVActivityIndicatorAnimationBallZigZagDeflect alloc] init];
        case NVActivityIndicatorTypeBallTrianglePath:
            return [[NVActivityIndicatorAnimationBallTrianglePath alloc] init];
        case NVActivityIndicatorTypeBallScale:
            return [[NVActivityIndicatorAnimationBallScale alloc] init];
        case NVActivityIndicatorTypeLineScale:
            return [[NVActivityIndicatorAnimationLineScale alloc] init];
        case NVActivityIndicatorTypeLineScaleParty:
            return [[NVActivityIndicatorAnimationLineScaleParty alloc] init];
        case NVActivityIndicatorTypeBallScaleMultiple:
            return [[NVActivityIndicatorAnimationBallScaleMultiple alloc] init];
        case NVActivityIndicatorTypeBallPulseSync:
            return [[NVActivityIndicatorAnimationBallPulseSync alloc] init];
        case NVActivityIndicatorTypeBallBeat:
            return [[NVActivityIndicatorAnimationBallBeat alloc] init];
        case NVActivityIndicatorTypeBallDoubleBounce:
            return [[NVActivityIndicatorAnimationBallDoubleBounce alloc] init];
        case NVActivityIndicatorTypeLineScalePulseOut:
            return [[NVActivityIndicatorAnimationLineScalePulseOut alloc] init];
        case NVActivityIndicatorTypeLineScalePulseOutRapid:
            return [[NVActivityIndicatorAnimationLineScalePulseOutRapid alloc] init];
        case NVActivityIndicatorTypeBallScaleRipple:
            return [[NVActivityIndicatorAnimationBallScaleRipple alloc] init];
        case NVActivityIndicatorTypeBallScaleRippleMultiple:
            return [[NVActivityIndicatorAnimationBallScaleRippleMultiple alloc] init];
        case NVActivityIndicatorTypeBallSpinFadeLoader:
            return [[NVActivityIndicatorAnimationBallSpinFadeLoader alloc] init];
        case NVActivityIndicatorTypeLineSpinFadeLoader:
            return [[NVActivityIndicatorAnimationLineSpinFadeLoader alloc] init];
        case NVActivityIndicatorTypeTriangleSkewSpin:
            return [[NVActivityIndicatorAnimationTriangleSkewSpin alloc] init];
        case NVActivityIndicatorTypePacman:
            return [[NVActivityIndicatorAnimationPacman alloc] init];
        case NVActivityIndicatorTypeBallGridBeat:
            return [[NVActivityIndicatorAnimationBallGridBeat alloc] init];
        case NVActivityIndicatorTypeSemiCircleSpin:
            return [[NVActivityIndicatorAnimationSemiCircleSpin alloc] init];
        case NVActivityIndicatorTypeBallRotateChase:
            return [[NVActivityIndicatorAnimationBallRotateChase alloc] init];
        case NVActivityIndicatorTypeOrbit:
            return [[NVActivityIndicatorAnimationOrbit alloc] init];
        case NVActivityIndicatorTypeAudioEqualizer:
            return [[NVActivityIndicatorAnimationAudioEqualizer alloc] init];
        case NVActivityIndicatorTypeCircleStrokeSpin:
            return [[NVActivityIndicatorAnimationCircleStrokeSpin alloc] init];
    }
}

#pragma mark - Private Methods

- (void)setUpAnimation {
    id<NVActivityIndicatorAnimationDelegate> animation = [NVActivityIndicatorView animationForType:self.type];
    CGRect animationRect = UIEdgeInsetsInsetRect(self.frame, UIEdgeInsetsMake(self.padding, self.padding, self.padding, self.padding));
    CGFloat minEdge = MIN(animationRect.size.width, animationRect.size.height);
    
    self.layer.sublayers = nil;
    animationRect.size = CGSizeMake(minEdge, minEdge);
    
    // Use the new method with speed multiplier if available, fallback to old method
    if ([animation respondsToSelector:@selector(setUpAnimationInLayer:size:color:speedMultiplier:)]) {
        [animation setUpAnimationInLayer:self.layer size:animationRect.size color:self.color speedMultiplier:self.animationSpeedMultiplier];
    } else {
        [animation setUpAnimationInLayer:self.layer size:animationRect.size color:self.color];
    }
}

- (void)setType:(NVActivityIndicatorType)type {
    _type = type;
    if (!CGSizeEqualToSize(self.bounds.size, CGSizeZero)) {
        [self setUpAnimation];
    }
}

- (void)setColor:(UIColor *)color {
    _color = color;
    if (!CGSizeEqualToSize(self.bounds.size, CGSizeZero)) {
        [self setUpAnimation];
    }
}

- (void)setPadding:(CGFloat)padding {
    _padding = padding;
    if (!CGSizeEqualToSize(self.bounds.size, CGSizeZero)) {
        [self setUpAnimation];
    }
}

- (void)setAnimationSpeedMultiplier:(CGFloat)animationSpeedMultiplier {
    _animationSpeedMultiplier = animationSpeedMultiplier;
    if (!CGSizeEqualToSize(self.bounds.size, CGSizeZero)) {
        [self setUpAnimation];
    }
}

@end
