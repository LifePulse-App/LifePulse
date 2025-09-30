#import <UIKit/UIKit.h>
#import "NVActivityIndicatorAnimationDelegate.h"

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, NVActivityIndicatorType) {
    NVActivityIndicatorTypeBlank,
    NVActivityIndicatorTypeBallPulse,
    NVActivityIndicatorTypeBallGridPulse,
    NVActivityIndicatorTypeBallClipRotate,
    NVActivityIndicatorTypeSquareSpin,
    NVActivityIndicatorTypeBallClipRotatePulse,
    NVActivityIndicatorTypeBallClipRotateMultiple,
    NVActivityIndicatorTypeBallPulseRise,
    NVActivityIndicatorTypeBallRotate,
    NVActivityIndicatorTypeCubeTransition,
    NVActivityIndicatorTypeBallZigZag,
    NVActivityIndicatorTypeBallZigZagDeflect,
    NVActivityIndicatorTypeBallTrianglePath,
    NVActivityIndicatorTypeBallScale,
    NVActivityIndicatorTypeLineScale,
    NVActivityIndicatorTypeLineScaleParty,
    NVActivityIndicatorTypeBallScaleMultiple,
    NVActivityIndicatorTypeBallPulseSync,
    NVActivityIndicatorTypeBallBeat,
    NVActivityIndicatorTypeBallDoubleBounce,
    NVActivityIndicatorTypeLineScalePulseOut,
    NVActivityIndicatorTypeLineScalePulseOutRapid,
    NVActivityIndicatorTypeBallScaleRipple,
    NVActivityIndicatorTypeBallScaleRippleMultiple,
    NVActivityIndicatorTypeBallSpinFadeLoader,
    NVActivityIndicatorTypeLineSpinFadeLoader,
    NVActivityIndicatorTypeTriangleSkewSpin,
    NVActivityIndicatorTypePacman,
    NVActivityIndicatorTypeBallGridBeat,
    NVActivityIndicatorTypeSemiCircleSpin,
    NVActivityIndicatorTypeBallRotateChase,
    NVActivityIndicatorTypeOrbit,
    NVActivityIndicatorTypeAudioEqualizer,
    NVActivityIndicatorTypeCircleStrokeSpin
};

typedef void (^FadeInAnimation)(UIView *view);
typedef void (^FadeOutAnimation)(UIView *view, void (^completion)(void));

@interface NVActivityIndicatorView : UIView

@property (class, nonatomic, assign) NVActivityIndicatorType defaultType;
@property (class, nonatomic, strong) UIColor *defaultColor;
@property (class, nonatomic, strong) UIColor *defaultTextColor;
@property (class, nonatomic, assign) CGFloat defaultPadding;
@property (class, nonatomic, assign) CGFloat defaultAnimationSpeedMultiplier;
@property (class, nonatomic, assign) CGSize defaultBlockerSize;
@property (class, nonatomic, assign) NSInteger defaultBlockerDisplayTimeThreshold;
@property (class, nonatomic, assign) NSInteger defaultBlockerMinimumDisplayTime;
@property (class, nonatomic, strong, nullable) NSString *defaultBlockerMessage;
@property (class, nonatomic, assign) CGFloat defaultBlockerMessageSpacing;
@property (class, nonatomic, strong) UIFont *defaultBlockerMessageFont;
@property (class, nonatomic, strong) UIColor *defaultBlockerBackgroundColor;
@property (class, nonatomic, copy) FadeInAnimation defaultFadeInAnimation;
@property (class, nonatomic, copy) FadeOutAnimation defaultFadeOutAnimation;

@property (nonatomic, assign) NVActivityIndicatorType type;
@property (nonatomic, strong) IBInspectable UIColor *color;
@property (nonatomic, assign) IBInspectable CGFloat padding;
@property (nonatomic, assign) IBInspectable CGFloat animationSpeedMultiplier;

- (instancetype)initWithFrame:(CGRect)frame type:(NVActivityIndicatorType)type color:(nullable UIColor *)color padding:(CGFloat)padding;
- (instancetype)initWithFrame:(CGRect)frame type:(NVActivityIndicatorType)type color:(nullable UIColor *)color padding:(CGFloat)padding animationSpeedMultiplier:(CGFloat)animationSpeedMultiplier;
- (instancetype)initWithFrame:(CGRect)frame type:(NVActivityIndicatorType)type color:(nullable UIColor *)color;
- (instancetype)initWithFrame:(CGRect)frame type:(NVActivityIndicatorType)type;

+ (id<NVActivityIndicatorAnimationDelegate>)animationForType:(NVActivityIndicatorType)type;

@end

NS_ASSUME_NONNULL_END
